const bcrypt = require('bcryptjs');
const asyncHandler = require('../middleware/asyncHandler');
const { clearRoleCache } = require('../middleware/auth');
const Project = require('../models/Project');
const Floor = require('../models/Floor');
const Location = require('../models/Location');
const Element = require('../models/Element');
const TradeElement = require('../models/TradeElement');
const Trade = require('../models/Trade');
const CheckPoint = require('../models/CheckPoint');
const Inspection = require('../models/Inspection');
const User = require('../models/User');

const VALID_STATUSES = ['DRAFT', 'SUBMITTED', 'APPROVED', 'REJECTED'];

// ── Stats ─────────────────────────────────────────────────────────────────────
exports.getStats = asyncHandler(async (_req, res) => {
  const [totalInspections, submitted, draft, totalProjects, totalTrades, totalUsers] =
    await Promise.all([
      Inspection.countDocuments(),
      Inspection.countDocuments({ status: 'SUBMITTED' }),
      Inspection.countDocuments({ status: 'DRAFT' }),
      Project.countDocuments(),
      Trade.countDocuments(),
      User.countDocuments(),
    ]);
  res.json({ totalInspections, submitted, draft, totalProjects, totalTrades, totalUsers });
});

// ── Projects ──────────────────────────────────────────────────────────────────
exports.getProjects = asyncHandler(async (_req, res) => {
  res.json(await Project.find().sort({ type: 1, name: 1 }).lean());
});

exports.createProject = asyncHandler(async (req, res) => {
  const { name, type, description, mapImage, maps } = req.body;
  res.status(201).json(await Project.create({ name, type, description, mapImage, maps }));
});

exports.updateProject = asyncHandler(async (req, res) => {
  const project = await Project.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
  if (!project) return res.status(404).json({ message: 'Project not found.' });
  res.json(project);
});

exports.deleteProject = asyncHandler(async (req, res) => {
  const pid = req.params.id;
  const elementIds = await Element.find({ projectId: pid }).distinct('_id');
  await Promise.all([
    Project.findByIdAndDelete(pid),
    Floor.deleteMany({ projectId: pid }),
    Location.deleteMany({ projectId: pid }),
    Element.deleteMany({ projectId: pid }),
    TradeElement.deleteMany({ elementId: { $in: elementIds } }),
    CheckPoint.deleteMany({ projectId: pid }),
    Inspection.deleteMany({ projectId: pid }),
  ]);
  res.json({ message: 'Project deleted.' });
});

// ── Floors ────────────────────────────────────────────────────────────────────
exports.getFloors = asyncHandler(async (req, res) => {
  const query = req.query.projectId ? { projectId: req.query.projectId } : {};
  res.json(await Floor.find(query).populate('projectId', 'name').sort({ order: 1 }).lean());
});

exports.createFloor = asyncHandler(async (req, res) => {
  const { projectId, code, label, order, isProjectLevel, mapImage, maps } = req.body;
  res.status(201).json(await Floor.create({ projectId, code, label, order, isProjectLevel, mapImage, maps }));
});

exports.updateFloor = asyncHandler(async (req, res) => {
  const floor = await Floor.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
  if (!floor) return res.status(404).json({ message: 'Floor not found.' });
  res.json(floor);
});

exports.deleteFloor = asyncHandler(async (req, res) => {
  const fid = req.params.id;
  const elementIds = await Element.find({ floorId: fid }).distinct('_id');
  await Promise.all([
    Floor.findByIdAndDelete(fid),
    Location.deleteMany({ floorId: fid }),
    Element.deleteMany({ floorId: fid }),
    TradeElement.deleteMany({ elementId: { $in: elementIds } }),
    Inspection.deleteMany({ floorId: fid }),
  ]);
  res.json({ message: 'Floor deleted.' });
});

// ── Locations ─────────────────────────────────────────────────────────────────
exports.getLocations = asyncHandler(async (req, res) => {
  const query = req.query.floorId ? { floorId: req.query.floorId } : {};
  res.json(await Location.find(query).sort({ type: 1, name: 1 }).lean());
});

exports.createLocation = asyncHandler(async (req, res) => {
  const { floorId, projectId, name, type } = req.body;
  res.status(201).json(await Location.create({ floorId, projectId, name, type }));
});

exports.updateLocation = asyncHandler(async (req, res) => {
  const loc = await Location.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
  if (!loc) return res.status(404).json({ message: 'Location not found.' });
  res.json(loc);
});

exports.deleteLocation = asyncHandler(async (req, res) => {
  const lid = req.params.id;
  const elementIds = await Element.find({ locationId: lid }).distinct('_id');
  await Promise.all([
    Location.findByIdAndDelete(lid),
    Element.deleteMany({ locationId: lid }),
    TradeElement.deleteMany({ elementId: { $in: elementIds } }),
    Inspection.deleteMany({ locationId: lid }),
  ]);
  res.json({ message: 'Location deleted.' });
});

// ── Elements ──────────────────────────────────────────────────────────────────
exports.getElements = asyncHandler(async (req, res) => {
  const query = req.query.locationId ? { locationId: req.query.locationId } : {};
  res.json(await Element.find(query).sort({ type: 1, order: 1 }).lean());
});

exports.createElement = asyncHandler(async (req, res) => {
  const { locationId, floorId, projectId, name, type, order } = req.body;
  res.status(201).json(await Element.create({ locationId, floorId, projectId, name, type, order }));
});

exports.updateElement = asyncHandler(async (req, res) => {
  const el = await Element.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
  if (!el) return res.status(404).json({ message: 'Element not found.' });
  res.json(el);
});

exports.deleteElement = asyncHandler(async (req, res) => {
  const eid = req.params.id;
  const elementTrades = await Trade.find({ elementId: eid }, '_id').lean();
  const tradeIds = elementTrades.map(t => t._id);
  await Promise.all([
    tradeIds.length ? CheckPoint.deleteMany({ tradeId: { $in: tradeIds } }) : Promise.resolve(),
    Trade.deleteMany({ elementId: eid }),
    TradeElement.deleteMany({ elementId: eid }),
    Inspection.deleteMany({ elementId: eid }),
    Element.findByIdAndDelete(eid),
  ]);
  res.json({ message: 'Element deleted.' });
});

// ── TradeElements (eligible element assignments per trade) ─────────────────────
exports.getTradeElements = asyncHandler(async (req, res) => {
  const query = {};
  if (req.query.tradeId) query.tradeId = req.query.tradeId;
  if (req.query.locationId) {
    const elemIds = await Element.find({ locationId: req.query.locationId }).distinct('_id');
    query.elementId = { $in: elemIds };
  } else if (req.query.elementId) {
    query.elementId = req.query.elementId;
  }
  const items = await TradeElement.find(query)
    .populate({ path: 'elementId', populate: [{ path: 'locationId', select: 'name' }, { path: 'floorId', select: 'label' }, { path: 'projectId', select: 'name' }] })
    .populate('tradeId', 'name color')
    .sort({ createdAt: 1 })
    .lean();
  res.json(items);
});

exports.createTradeElement = asyncHandler(async (req, res) => {
  const { tradeId, elementId } = req.body;
  const te = await TradeElement.create({ tradeId, elementId });
  res.status(201).json(te);
});

exports.deleteTradeElement = asyncHandler(async (req, res) => {
  await TradeElement.findByIdAndDelete(req.params.id);
  res.json({ message: 'Assignment removed.' });
});

// ── Trades ────────────────────────────────────────────────────────────────────
exports.getTrades = asyncHandler(async (req, res) => {
  const query = req.query.elementId
    ? { elementId: req.query.elementId }
    : { $or: [{ elementId: null }, { elementId: { $exists: false } }] };
  res.json(await Trade.find(query).sort({ order: 1 }).lean());
});

exports.createTrade = asyncHandler(async (req, res) => {
  const { name, isHoldPoint, whyItMatters, isPending, isHidden, isRecurring, order, color, elementId } = req.body;
  res.status(201).json(await Trade.create({ name, isHoldPoint, whyItMatters, isPending, isHidden, isRecurring, order, color, elementId }));
});

exports.updateTrade = asyncHandler(async (req, res) => {
  const trade = await Trade.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
  if (!trade) return res.status(404).json({ message: 'Trade not found.' });
  res.json(trade);
});

exports.deleteTrade = asyncHandler(async (req, res) => {
  await Promise.all([
    Trade.findByIdAndDelete(req.params.id),
    CheckPoint.deleteMany({ tradeId: req.params.id }),
    TradeElement.deleteMany({ tradeId: req.params.id }),
    Inspection.deleteMany({ tradeId: req.params.id }),
  ]);
  res.json({ message: 'Trade deleted.' });
});

// ── CheckPoints ───────────────────────────────────────────────────────────────
exports.getCheckPoints = asyncHandler(async (req, res) => {
  const query = {};
  if (req.query.tradeId)   query.tradeId   = req.query.tradeId;
  if (req.query.projectId) query.projectId = req.query.projectId;
  else                     query.projectId = null;
  res.json(await CheckPoint.find(query).populate('tradeId', 'name').sort({ order: 1 }).lean());
});

exports.createCheckPoint = asyncHandler(async (req, res) => {
  const { projectId, tradeId, order, title, standard, howToCheck, photoRequired, isHidden } = req.body;
  res.status(201).json(await CheckPoint.create({ projectId, tradeId, order, title, standard, howToCheck, photoRequired, isHidden }));
});

exports.updateCheckPoint = asyncHandler(async (req, res) => {
  const cp = await CheckPoint.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
  if (!cp) return res.status(404).json({ message: 'CheckPoint not found.' });
  res.json(cp);
});

exports.deleteCheckPoint = asyncHandler(async (req, res) => {
  await CheckPoint.findByIdAndDelete(req.params.id);
  res.json({ message: 'CheckPoint deleted.' });
});

// ── Inspections ───────────────────────────────────────────────────────────────
exports.getInspections = asyncHandler(async (req, res) => {
  const { status, projectId, floorId, locationId, tradeId, includeResults } = req.query;
  const query = {};
  if (status) {
    if (!VALID_STATUSES.includes(status))
      return res.status(400).json({ message: `Invalid status. Must be one of: ${VALID_STATUSES.join(', ')}` });
    query.status = status;
  }
  if (projectId)  query.projectId  = projectId;
  if (floorId)    query.floorId    = floorId;
  if (locationId) query.locationId = locationId;
  if (tradeId)    query.tradeId    = tradeId;

  let q = Inspection.find(query)
    .populate('projectId', 'name')
    .populate('floorId',   'code label')
    .populate('locationId','name')
    .populate('elementId', 'name type')
    .populate('tradeId',   'name');

  if (includeResults === 'true') {
    q = q.populate({ path: 'results.checkPointId', select: 'title order tradeId' });
  }

  res.json(await q.sort({ createdAt: -1 }).lean());
});

exports.getInspection = asyncHandler(async (req, res) => {
  const inspection = await Inspection.findById(req.params.id)
    .populate('projectId')
    .populate('floorId')
    .populate('locationId')
    .populate('elementId', 'name type')
    .populate('tradeId')
    .populate('results.checkPointId');
  if (!inspection) return res.status(404).json({ message: 'Inspection not found.' });
  res.json(inspection);
});

exports.updateInspection = asyncHandler(async (req, res) => {
  const inspection = await Inspection.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
  if (!inspection) return res.status(404).json({ message: 'Inspection not found.' });
  res.json(inspection);
});

exports.deleteInspection = asyncHandler(async (req, res) => {
  await Inspection.findByIdAndDelete(req.params.id);
  res.json({ message: 'Inspection deleted.' });
});

exports.approveInspection = asyncHandler(async (req, res) => {
  const { reviewNotes } = req.body;
  const reviewedBy = req.user?.name || req.user?.email || 'Admin';
  const inspection = await Inspection.findByIdAndUpdate(
    req.params.id,
    {
      status: 'APPROVED',
      approvedAt: new Date(),
      reviewedBy,
      reviewNotes: reviewNotes || '',
      $push: { timeline: { event: 'APPROVED', by: reviewedBy, details: reviewNotes || '' } },
    },
    { new: true, runValidators: true }
  ).populate('projectId').populate('floorId').populate('locationId').populate('elementId','name type').populate('tradeId').populate('results.checkPointId');
  if (!inspection) return res.status(404).json({ message: 'Inspection not found.' });
  res.json(inspection);
});

exports.rejectInspection = asyncHandler(async (req, res) => {
  const { reviewNotes } = req.body;
  const reviewedBy = req.user?.name || req.user?.email || 'Admin';
  const inspection = await Inspection.findByIdAndUpdate(
    req.params.id,
    {
      status: 'REJECTED',
      reviewedBy,
      reviewNotes: reviewNotes || '',
      $push: { timeline: { event: 'REJECTED', by: reviewedBy, details: reviewNotes || '' } },
    },
    { new: true, runValidators: true }
  ).populate('projectId').populate('floorId').populate('locationId').populate('elementId','name type').populate('tradeId').populate('results.checkPointId');
  if (!inspection) return res.status(404).json({ message: 'Inspection not found.' });
  res.json(inspection);
});

// ── Users ─────────────────────────────────────────────────────────────────────
exports.getUsers = asyncHandler(async (_req, res) => {
  res.json(await User.find().select('name email role avatar createdAt').sort({ createdAt: -1 }).lean());
});

exports.createUser = asyncHandler(async (req, res) => {
  const { name, email, password, role } = req.body;
  const user = await User.create({ name, email, password, role });
  res.status(201).json({ _id: user._id, name: user.name, email: user.email, role: user.role, createdAt: user.createdAt });
});

exports.updateUser = asyncHandler(async (req, res) => {
  const { name, email, password, role, avatar } = req.body;
  const updates = { name, email, avatar };

  if (password) {
    updates.password = await bcrypt.hash(password, parseInt(process.env.BCRYPT_ROUNDS) || 12);
  }

  if (role !== undefined) {
    const arr = Array.isArray(role) ? role : [role];
    const normalized = [...new Set(arr.map(r => String(r).toLowerCase().trim()).filter(Boolean))];
    updates.role = normalized.length ? normalized : ['user'];

    // Privilege escalation guard: only admin can grant the admin role
    const callerRoles = req.user?.role || [];
    const isAdmin = callerRoles.includes('admin');
    if (!isAdmin && updates.role.includes('admin')) {
      return res.status(403).json({ message: 'Only admins can grant the admin role.' });
    }
  }

  const user = await User.findByIdAndUpdate(req.params.id, updates, { new: true, runValidators: true });
  if (!user) return res.status(404).json({ message: 'User not found.' });

  // Invalidate permission cache so new role takes effect immediately
  if (updates.role) updates.role.forEach(r => clearRoleCache(r));

  res.json({ _id: user._id, name: user.name, email: user.email, role: user.role, createdAt: user.createdAt });
});

exports.deleteUser = asyncHandler(async (req, res) => {
  if (req.user._id.toString() === req.params.id)
    return res.status(400).json({ message: 'Cannot delete your own account.' });
  await User.findByIdAndDelete(req.params.id);
  res.json({ message: 'User deleted.' });
});
