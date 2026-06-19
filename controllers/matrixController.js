const asyncHandler = require('../middleware/asyncHandler');
const Location = require('../models/Location');
const Element = require('../models/Element');
const Trade = require('../models/Trade');
const TradeElement = require('../models/TradeElement');
const CheckPoint = require('../models/CheckPoint');
const Inspection = require('../models/Inspection');

// elements = [{ elementId: ObjectId, _elem: Element }]
// inspections = submitted inspections for this room+trade
// checkpoints = checkpoints for this trade
function computeCellStatus(elements, inspections, checkpoints) {
  if (elements.length === 0) return 'NA';
  if (inspections.length === 0) return 'NOT_STARTED';

  // NOT_OK check — takes priority
  const hasNotOk = inspections.some(ins =>
    ins.results && ins.results.some(r => r.result === 'NOT_OK')
  );
  if (hasNotOk) return 'CROSS';

  // All walls must have a SUBMITTED inspection
  const submittedElemIds = inspections
    .filter(ins => ins.elementId)
    .map(ins => ins.elementId.toString());

  const allWallsSubmitted = elements.every(el =>
    submittedElemIds.includes(el.elementId.toString())
  );

  // Any PENDING checkpoint result?
  const hasPending = inspections.some(ins =>
    ins.results && ins.results.some(r => r.result === 'PENDING')
  );

  // photoRequired checkpoints where photo is missing
  const requiredCpIds = checkpoints
    .filter(cp => cp.photoRequired === true)
    .map(cp => cp._id.toString());

  const photoMissing = requiredCpIds.length > 0 && inspections.some(ins =>
    ins.results && ins.results.some(r =>
      requiredCpIds.includes(r.checkPointId?.toString()) &&
      (!r.photos || r.photos.length === 0)
    )
  );

  if (allWallsSubmitted && !hasPending && !photoMissing) return 'DONE';
  return 'IN_PROGRESS';
}

exports.getMatrix = asyncHandler(async (req, res) => {
  const { projectId, floorId } = req.query;
  if (!floorId) return res.status(400).json({ message: 'floorId is required.' });

  // 1. Rooms for this floor
  const rooms = await Location.find({ floorId }).sort({ type: 1, name: 1 }).lean();
  if (!rooms.length) return res.json({ trades: [], rooms: [] });
  const locationIds = rooms.map(r => r._id);

  // 2. Elements (walls) for these rooms
  const elements = await Element.find({ locationId: { $in: locationIds } }).lean();
  const elementIds = elements.map(e => e._id);

  // Index elements by id and by location
  const elemById = Object.fromEntries(elements.map(e => [String(e._id), e]));

  // 3. TradeElements for these elements (TradeElement has no locationId — bridge via Element)
  const tradeElements = elementIds.length > 0
    ? await TradeElement.find({ elementId: { $in: elementIds } }).lean()
    : [];

  // Build wallsByCell: `tradeId:locId` → [{ elementId, _elem }]
  const wallsByCell = {};
  tradeElements.forEach(te => {
    const eid = String(te.elementId);
    const tid = String(te.tradeId);
    const elem = elemById[eid];
    if (!elem) return;
    const lid = String(elem.locationId);
    const key = `${tid}:${lid}`;
    if (!wallsByCell[key]) wallsByCell[key] = [];
    if (!wallsByCell[key].some(w => String(w.elementId) === eid)) {
      wallsByCell[key].push({ elementId: te.elementId, _elem: elem });
    }
  });

  // 4. Trades that appear in TradeElements for this floor
  const tradeIds = [...new Set(tradeElements.map(te => String(te.tradeId)))];
  const trades = tradeIds.length > 0
    ? await Trade.find({ _id: { $in: tradeIds }, isHidden: { $ne: true } }).sort({ order: 1, name: 1 }).lean()
    : [];

  if (!trades.length) return res.json({ trades: [], rooms: rooms.map(r => ({ _id: r._id, name: r.name, type: r.type, tradeStatuses: {} })) });

  // 5. Submitted inspections for this floor
  const inspQuery = { floorId, status: 'SUBMITTED' };
  if (projectId) inspQuery.projectId = projectId;
  const inspections = await Inspection.find(inspQuery).lean();

  // Index inspections by `locId:tradeId`
  const inspByCell = {};
  inspections.forEach(ins => {
    const lid = String(ins.locationId);
    const tid = String(ins.tradeId);
    const key = `${lid}:${tid}`;
    if (!inspByCell[key]) inspByCell[key] = [];
    inspByCell[key].push(ins);
  });

  // 6. Checkpoints per trade
  const allTids = trades.map(t => t._id);
  const checkpoints = await CheckPoint.find({ tradeId: { $in: allTids }, isHidden: { $ne: true } }).lean();
  const cpsByTrade = {};
  checkpoints.forEach(cp => {
    const tid = String(cp.tradeId);
    if (!cpsByTrade[tid]) cpsByTrade[tid] = [];
    cpsByTrade[tid].push(cp);
  });

  // 7. Build result rows
  const resultRows = rooms.map(room => {
    const lid = String(room._id);
    const tradeStatuses = {};

    trades.forEach(trade => {
      const tid = String(trade._id);
      const wallAssignments = wallsByCell[`${tid}:${lid}`] || [];
      const roomInspections = inspByCell[`${lid}:${tid}`] || [];
      const tradeCps = cpsByTrade[tid] || [];

      const status = computeCellStatus(wallAssignments, roomInspections, tradeCps);

      // Per-wall detail for tooltip
      const walls = wallAssignments.map(wa => {
        const wallInsp = roomInspections.find(
          ins => ins.elementId && String(ins.elementId) === String(wa.elementId)
        );

        let wallStatus = 'not_started';
        let notOkCount = 0;
        let pendingCount = 0;
        let photoMissingCount = 0;

        if (wallInsp) {
          const results = wallInsp.results || [];
          notOkCount = results.filter(r => r.result === 'NOT_OK').length;
          pendingCount = results.filter(r => r.result === 'PENDING').length;

          const reqIds = tradeCps.filter(cp => cp.photoRequired).map(cp => String(cp._id));
          photoMissingCount = results.filter(r =>
            reqIds.includes(String(r.checkPointId)) &&
            (!r.photos || r.photos.length === 0)
          ).length;

          if (notOkCount > 0) wallStatus = 'not_ok';
          else if (pendingCount > 0 || photoMissingCount > 0) wallStatus = 'incomplete';
          else wallStatus = 'done';
        }

        return {
          elementId: wa.elementId,
          name: wa._elem?.name || String(wa.elementId),
          submitted: !!wallInsp,
          wallStatus,
          notOkCount,
          pendingCount,
          photoMissingCount,
        };
      });

      tradeStatuses[tid] = {
        status,
        walls,
        totalWalls: wallAssignments.length,
        submittedWalls: walls.filter(w => w.submitted).length,
        notOkWalls: walls.filter(w => w.wallStatus === 'not_ok').length,
      };
    });

    return { _id: room._id, name: room.name, type: room.type, tradeStatuses };
  });

  res.json({
    trades: trades.map(t => ({
      _id: t._id,
      name: t.name,
      order: t.order,
      isRecurring: t.isRecurring || false,
    })),
    rooms: resultRows,
  });
});
