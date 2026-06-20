const asyncHandler  = require('../middleware/asyncHandler');
const Floor         = require('../models/Floor');
const Location      = require('../models/Location');
const Element       = require('../models/Element');
const Trade         = require('../models/Trade');
const TradeElement  = require('../models/TradeElement');
const Inspection    = require('../models/Inspection');
const ProgressPlan  = require('../models/ProgressPlan');
const Milestone     = require('../models/Milestone');

// ── GET /admin/progress/summary?projectId= ────────────────────────────────────
exports.getSummary = asyncHandler(async (req, res) => {
  const { projectId } = req.query;
  if (!projectId) return res.status(400).json({ message: 'projectId is required.' });

  // 1. Floors
  const floors = await Floor.find({ projectId }).sort({ order: 1, label: 1 }).lean();
  const floorIds = floors.map(f => f._id);
  if (!floors.length) return res.json({ overview: { totalSlots: 0, submitted: 0, draft: 0, notStarted: 0, pct: 0 }, floors: [], trades: [] });

  // 2. Rooms
  const rooms = await Location.find({ floorId: { $in: floorIds } }).lean();
  const roomIds = rooms.map(r => r._id);
  const roomsByFloor = {};
  rooms.forEach(r => {
    const fid = String(r.floorId);
    if (!roomsByFloor[fid]) roomsByFloor[fid] = [];
    roomsByFloor[fid].push(r);
  });

  // 3. Elements + index by room
  const elements = await Element.find({ locationId: { $in: roomIds } }).lean();
  const elemById  = {};
  elements.forEach(e => { elemById[String(e._id)] = e; });

  // 4. TradeElements → which trades are on which rooms
  const tradeElements = await TradeElement.find({ elementId: { $in: elements.map(e => e._id) } }).lean();
  // roomId → Set of tradeIds
  const tradesByRoom = {};
  tradeElements.forEach(te => {
    const elem = elemById[String(te.elementId)];
    if (!elem) return;
    const rid = String(elem.locationId);
    const tid = String(te.tradeId);
    if (!tradesByRoom[rid]) tradesByRoom[rid] = new Set();
    tradesByRoom[rid].add(tid);
  });

  // 5. Trades (visible)
  const allTradeIds = [...new Set(tradeElements.map(te => String(te.tradeId)))];
  const trades = allTradeIds.length
    ? await Trade.find({ _id: { $in: allTradeIds }, isHidden: { $ne: true } }).sort({ order: 1, name: 1 }).lean()
    : [];

  // 6. Inspections
  const inspections = await Inspection.find({ projectId }).lean();
  // Keep only latest status per room+trade (submitted beats draft)
  const latestBySlot = {}; // "roomId:tradeId" → 'SUBMITTED' | 'DRAFT'
  inspections.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt)).forEach(ins => {
    const key = `${ins.locationId}:${ins.tradeId}`;
    if (!latestBySlot[key] || ins.status === 'SUBMITTED') {
      latestBySlot[key] = ins.status;
    }
  });

  // 7. Progress plans
  const plans = await ProgressPlan.find({ projectId }).lean();
  const planMap = {}; // "floorId:tradeId" → plan
  plans.forEach(p => { planMap[`${p.floorId}:${p.tradeId}`] = p; });

  const today = new Date();

  // 8. Build per-floor data
  const floorData = floors.map(floor => {
    const fid       = String(floor._id);
    const floorRooms = roomsByFloor[fid] || [];

    const tradeRows = trades.map(trade => {
      const tid = String(trade._id);
      const roomsWithTrade = floorRooms.filter(r => tradesByRoom[String(r._id)]?.has(tid));
      const total = roomsWithTrade.length;
      if (total === 0) return null;

      let submitted = 0, draft = 0;
      roomsWithTrade.forEach(r => {
        const s = latestBySlot[`${r._id}:${tid}`];
        if (s === 'SUBMITTED') submitted++;
        else if (s === 'DRAFT') draft++;
      });
      const notStarted = total - submitted - draft;
      const pct        = Math.round((submitted / total) * 100);

      const plan = planMap[`${fid}:${tid}`] || null;
      let planStatus = null;
      if (plan && plan.plannedEnd) {
        if (pct >= 100) planStatus = 'COMPLETED';
        else if (new Date(plan.plannedEnd) < today) planStatus = 'DELAYED';
        else {
          const totalMs    = new Date(plan.plannedEnd) - new Date(plan.plannedStart || plan.createdAt);
          const elapsedMs  = today - new Date(plan.plannedStart || plan.createdAt);
          const expectedPct = totalMs > 0 ? Math.min(100, Math.round((elapsedMs / totalMs) * 100)) : 0;
          planStatus = pct >= expectedPct - 10 ? 'ON_TRACK' : 'AT_RISK';
        }
      }

      return { tradeId: tid, tradeName: trade.name, total, submitted, draft, notStarted, pct, plan, planStatus };
    }).filter(Boolean);

    const totalSlots = tradeRows.reduce((s, t) => s + t.total, 0);
    const totalSub   = tradeRows.reduce((s, t) => s + t.submitted, 0);
    const totalDraft = tradeRows.reduce((s, t) => s + t.draft, 0);
    const overallPct = totalSlots > 0 ? Math.round((totalSub / totalSlots) * 100) : 0;

    return {
      floorId: fid, name: floor.label, order: floor.order,
      totalRooms: floorRooms.length, totalSlots, submitted: totalSub,
      draft: totalDraft, notStarted: totalSlots - totalSub - totalDraft,
      pct: overallPct, trades: tradeRows,
    };
  });

  // 9. Per-trade summary across all floors
  const tradeData = trades.map(trade => {
    const tid = String(trade._id);
    const rows = floorData.flatMap(f => f.trades.filter(t => t.tradeId === tid));
    const total     = rows.reduce((s, t) => s + t.total, 0);
    const submitted = rows.reduce((s, t) => s + t.submitted, 0);
    const draft     = rows.reduce((s, t) => s + t.draft, 0);
    const pct       = total > 0 ? Math.round((submitted / total) * 100) : 0;
    if (total === 0) return null;
    return { tradeId: tid, tradeName: trade.name, total, submitted, draft, notStarted: total - submitted - draft, pct, floors: rows };
  }).filter(Boolean);

  // 10. Overall
  const totalSlots = floorData.reduce((s, f) => s + f.totalSlots, 0);
  const totalSub   = floorData.reduce((s, f) => s + f.submitted, 0);
  const totalDraft = floorData.reduce((s, f) => s + f.draft, 0);
  const overallPct = totalSlots > 0 ? Math.round((totalSub / totalSlots) * 100) : 0;

  res.json({
    overview: { totalSlots, submitted: totalSub, draft: totalDraft, notStarted: totalSlots - totalSub - totalDraft, pct: overallPct },
    floors:   floorData,
    trades:   tradeData,
  });
});

// ── GET /admin/progress/plans?projectId= ─────────────────────────────────────
exports.getPlans = asyncHandler(async (req, res) => {
  const { projectId } = req.query;
  if (!projectId) return res.status(400).json({ message: 'projectId is required.' });
  const plans = await ProgressPlan.find({ projectId })
    .populate('floorId', 'label order')
    .populate('tradeId', 'name order')
    .lean();
  res.json(plans);
});

// ── PUT /admin/progress/plans  (upsert by projectId+floorId+tradeId) ─────────
exports.upsertPlan = asyncHandler(async (req, res) => {
  const { projectId, floorId, tradeId, plannedStart, plannedEnd, notes } = req.body;
  if (!projectId || !floorId || !tradeId) return res.status(400).json({ message: 'projectId, floorId, tradeId required.' });

  const plan = await ProgressPlan.findOneAndUpdate(
    { projectId, floorId, tradeId },
    { plannedStart: plannedStart || null, plannedEnd: plannedEnd || null, notes: notes || '' },
    { new: true, upsert: true, setDefaultsOnInsert: true, runValidators: true }
  );
  res.json(plan);
});

// ── DELETE /admin/progress/plans/:id ─────────────────────────────────────────
exports.deletePlan = asyncHandler(async (req, res) => {
  await ProgressPlan.findByIdAndDelete(req.params.id);
  res.json({ message: 'Plan deleted.' });
});

// ── GET /admin/progress/milestones?projectId= ────────────────────────────────
exports.getMilestones = asyncHandler(async (req, res) => {
  const { projectId } = req.query;
  if (!projectId) return res.status(400).json({ message: 'projectId is required.' });
  const milestones = await Milestone.find({ projectId })
    .populate('floorId', 'label')
    .populate('tradeId', 'name')
    .sort({ targetDate: 1 })
    .lean();
  res.json(milestones);
});

// ── POST /admin/progress/milestones ──────────────────────────────────────────
exports.createMilestone = asyncHandler(async (req, res) => {
  const { projectId, title, description, targetDate, priority, floorId, tradeId } = req.body;
  if (!projectId || !title || !targetDate) return res.status(400).json({ message: 'projectId, title, targetDate required.' });

  const m = await Milestone.create({ projectId, title, description, targetDate, priority, floorId: floorId || null, tradeId: tradeId || null });
  res.status(201).json(m);
});

// ── PUT /admin/progress/milestones/:id ───────────────────────────────────────
exports.updateMilestone = asyncHandler(async (req, res) => {
  const { title, description, targetDate, priority, floorId, tradeId, completedAt } = req.body;
  const m = await Milestone.findByIdAndUpdate(
    req.params.id,
    { title, description, targetDate, priority, floorId: floorId || null, tradeId: tradeId || null, completedAt: completedAt || null },
    { new: true, runValidators: true }
  ).populate('floorId', 'label').populate('tradeId', 'name');
  if (!m) return res.status(404).json({ message: 'Milestone not found.' });
  res.json(m);
});

// ── DELETE /admin/progress/milestones/:id ────────────────────────────────────
exports.deleteMilestone = asyncHandler(async (req, res) => {
  await Milestone.findByIdAndDelete(req.params.id);
  res.json({ message: 'Milestone deleted.' });
});
