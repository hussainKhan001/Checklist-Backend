const asyncHandler = require('../middleware/asyncHandler');
const Location = require('../models/Location');
const Element = require('../models/Element');
const Trade = require('../models/Trade');
const TradeElement = require('../models/TradeElement');
const CheckPoint = require('../models/CheckPoint');
const Inspection = require('../models/Inspection');
const Floor = require('../models/Floor');

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

  // Index inspections by `locId:tradeId`, keeping only the most recent per wall element
  const inspByCell = {};
  // Sort newest-first so the first encountered per wall is the latest
  const sortedInspections = [...inspections].sort((a, b) =>
    new Date(b.submittedAt || b.createdAt) - new Date(a.submittedAt || a.createdAt)
  );
  sortedInspections.forEach(ins => {
    const lid = String(ins.locationId);
    const tid = String(ins.tradeId);
    const key = `${lid}:${tid}`;
    if (!inspByCell[key]) inspByCell[key] = [];

    // For wall-level inspections, keep only the latest per elementId
    if (ins.elementId) {
      const eid = String(ins.elementId);
      const alreadyHasWall = inspByCell[key].some(
        ex => ex.elementId && String(ex.elementId) === eid
      );
      if (!alreadyHasWall) inspByCell[key].push(ins);
    } else {
      inspByCell[key].push(ins);
    }
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

      // Per-checkpoint aggregate across all walls in this room
      const cpStatuses = {};
      if (roomInspections.length > 0) {
        tradeCps.forEach(cp => {
          const cpId = String(cp._id);
          const cpResults = roomInspections
            .flatMap(ins => ins.results || [])
            .filter(r => String(r.checkPointId) === cpId);
          if (cpResults.length === 0)                         cpStatuses[cpId] = 'PENDING';
          else if (cpResults.some(r => r.result === 'NOT_OK')) cpStatuses[cpId] = 'NOT_OK';
          else if (cpResults.every(r => r.result === 'OK'))    cpStatuses[cpId] = 'OK';
          else                                                 cpStatuses[cpId] = 'PENDING';
        });
      }

      tradeStatuses[tid] = {
        status,
        walls,
        cpStatuses,
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
      checkpoints: (cpsByTrade[String(t._id)] || [])
        .slice().sort((a, b) => (a.order || 0) - (b.order || 0))
        .map(cp => ({ _id: cp._id, title: cp.title, order: cp.order })),
    })),
    rooms: resultRows,
  });
});

// ── Project-wide overview matrix (all floors × all trades) ────────────────────
exports.getProjectMatrix = asyncHandler(async (req, res) => {
  const { projectId } = req.query;
  if (!projectId) return res.status(400).json({ message: 'projectId is required.' });

  const floors = await Floor.find({ projectId }).sort({ order: 1, label: 1 }).lean();
  if (!floors.length) return res.json({ trades: [], floors: [] });

  const floorIds = floors.map(f => f._id);
  const rooms    = await Location.find({ floorId: { $in: floorIds } }).sort({ type: 1, name: 1 }).lean();
  if (!rooms.length) return res.json({ trades: [], floors: floors.map(f => ({ _id: f._id, label: f.label, rooms: [] })) });

  const locationIds  = rooms.map(r => r._id);
  const elements     = await Element.find({ locationId: { $in: locationIds } }).lean();
  const elementIds   = elements.map(e => e._id);
  const elemById     = Object.fromEntries(elements.map(e => [String(e._id), e]));

  const tradeElements = elementIds.length
    ? await TradeElement.find({ elementId: { $in: elementIds } }).lean()
    : [];

  const wallsByCell = {};
  tradeElements.forEach(te => {
    const eid  = String(te.elementId);
    const tid  = String(te.tradeId);
    const elem = elemById[eid];
    if (!elem) return;
    const lid = String(elem.locationId);
    const key = `${tid}:${lid}`;
    if (!wallsByCell[key]) wallsByCell[key] = [];
    if (!wallsByCell[key].some(w => String(w.elementId) === eid))
      wallsByCell[key].push({ elementId: te.elementId, _elem: elem });
  });

  const tradeIds = [...new Set(tradeElements.map(te => String(te.tradeId)))];
  const trades   = tradeIds.length
    ? await Trade.find({ _id: { $in: tradeIds }, isHidden: { $ne: true } }).sort({ order: 1, name: 1 }).lean()
    : [];

  const allTids    = trades.map(t => t._id);
  const checkpoints = await CheckPoint.find({ tradeId: { $in: allTids }, isHidden: { $ne: true } }).lean();
  const cpsByTrade  = {};
  checkpoints.forEach(cp => {
    const tid = String(cp.tradeId);
    if (!cpsByTrade[tid]) cpsByTrade[tid] = [];
    cpsByTrade[tid].push(cp);
  });

  const inspections = await Inspection.find({ projectId, status: 'SUBMITTED' }).lean();
  const inspByCell  = {};
  [...inspections]
    .sort((a, b) => new Date(b.submittedAt || b.createdAt) - new Date(a.submittedAt || a.createdAt))
    .forEach(ins => {
      const lid = String(ins.locationId);
      const tid = String(ins.tradeId);
      const key = `${lid}:${tid}`;
      if (!inspByCell[key]) inspByCell[key] = [];
      if (ins.elementId) {
        const eid = String(ins.elementId);
        if (!inspByCell[key].some(ex => ex.elementId && String(ex.elementId) === eid))
          inspByCell[key].push(ins);
      } else {
        inspByCell[key].push(ins);
      }
    });

  const roomsByFloor = {};
  floors.forEach(f => { roomsByFloor[String(f._id)] = []; });

  rooms.forEach(room => {
    const fid = String(room.floorId);
    const lid = String(room._id);
    const tradeStatuses = {};

    trades.forEach(trade => {
      const tid            = String(trade._id);
      const wallAssignments = wallsByCell[`${tid}:${lid}`] || [];
      const roomInspections = inspByCell[`${lid}:${tid}`]  || [];
      const tradeCps        = cpsByTrade[tid]               || [];
      tradeStatuses[tid]    = computeCellStatus(wallAssignments, roomInspections, tradeCps);
    });

    const vals         = Object.values(tradeStatuses);
    const doneCount    = vals.filter(s => s === 'DONE').length;
    const totalActive  = vals.filter(s => s !== 'NA').length;

    if (roomsByFloor[fid]) {
      roomsByFloor[fid].push({ _id: room._id, name: room.name, type: room.type, tradeStatuses, doneCount, totalActive });
    }
  });

  res.json({
    trades: trades.map(t => ({ _id: t._id, name: t.name, order: t.order })),
    floors: floors.map(f => ({ _id: f._id, label: f.label, rooms: roomsByFloor[String(f._id)] || [] })),
  });
});
