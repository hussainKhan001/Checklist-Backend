const bcrypt = require('bcryptjs');
const asyncHandler = require('../middleware/asyncHandler');
const Project = require('../models/Project');
const Floor = require('../models/Floor');
const Location = require('../models/Location');
const Element = require('../models/Element');
const TradeElement = require('../models/TradeElement');
const Trade = require('../models/Trade');
const CheckPoint = require('../models/CheckPoint');
const Inspection = require('../models/Inspection');
const User = require('../models/User');

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
  res.status(201).json(await Project.create(req.body));
});

exports.updateProject = asyncHandler(async (req, res) => {
  const project = await Project.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
  if (!project) return res.status(404).json({ message: 'Project not found.' });
  res.json(project);
});

exports.deleteProject = asyncHandler(async (req, res) => {
  await Project.findByIdAndDelete(req.params.id);
  await Promise.all([
    Floor.deleteMany({ projectId: req.params.id }),
    Location.deleteMany({ projectId: req.params.id }),
    Inspection.deleteMany({ projectId: req.params.id }),
  ]);
  res.json({ message: 'Project deleted.' });
});

// ── Floors ────────────────────────────────────────────────────────────────────
exports.getFloors = asyncHandler(async (req, res) => {
  const query = req.query.projectId ? { projectId: req.query.projectId } : {};
  res.json(await Floor.find(query).populate('projectId', 'name').sort({ order: 1 }).lean());
});

exports.createFloor = asyncHandler(async (req, res) => {
  res.status(201).json(await Floor.create(req.body));
});

exports.updateFloor = asyncHandler(async (req, res) => {
  const floor = await Floor.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
  if (!floor) return res.status(404).json({ message: 'Floor not found.' });
  res.json(floor);
});

exports.deleteFloor = asyncHandler(async (req, res) => {
  await Floor.findByIdAndDelete(req.params.id);
  await Location.deleteMany({ floorId: req.params.id });
  await Element.deleteMany({ floorId: req.params.id });
  res.json({ message: 'Floor deleted.' });
});

// ── Locations ─────────────────────────────────────────────────────────────────
exports.getLocations = asyncHandler(async (req, res) => {
  const query = req.query.floorId ? { floorId: req.query.floorId } : {};
  res.json(await Location.find(query).sort({ type: 1, name: 1 }).lean());
});

exports.createLocation = asyncHandler(async (req, res) => {
  res.status(201).json(await Location.create(req.body));
});

exports.updateLocation = asyncHandler(async (req, res) => {
  const loc = await Location.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
  if (!loc) return res.status(404).json({ message: 'Location not found.' });
  res.json(loc);
});

exports.deleteLocation = asyncHandler(async (req, res) => {
  await Location.findByIdAndDelete(req.params.id);
  await Element.deleteMany({ locationId: req.params.id });
  res.json({ message: 'Location deleted.' });
});

// ── Elements ──────────────────────────────────────────────────────────────────
exports.getElements = asyncHandler(async (req, res) => {
  const query = req.query.locationId ? { locationId: req.query.locationId } : {};
  res.json(await Element.find(query).sort({ type: 1, order: 1 }).lean());
});

exports.createElement = asyncHandler(async (req, res) => {
  res.status(201).json(await Element.create(req.body));
});

exports.updateElement = asyncHandler(async (req, res) => {
  const el = await Element.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
  if (!el) return res.status(404).json({ message: 'Element not found.' });
  res.json(el);
});

exports.deleteElement = asyncHandler(async (req, res) => {
  const elementTrades = await Trade.find({ elementId: req.params.id }, '_id').lean();
  const tradeIds = elementTrades.map(t => t._id);
  if (tradeIds.length) await CheckPoint.deleteMany({ tradeId: { $in: tradeIds } });
  await Trade.deleteMany({ elementId: req.params.id });
  await TradeElement.deleteMany({ elementId: req.params.id });
  await Element.findByIdAndDelete(req.params.id);
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
    .populate('tradeId', 'name')
    .sort({ createdAt: 1 })
    .lean();
  res.json(items);
});

exports.createTradeElement = asyncHandler(async (req, res) => {
  const te = await TradeElement.create(req.body);
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
  res.status(201).json(await Trade.create(req.body));
});

exports.updateTrade = asyncHandler(async (req, res) => {
  const trade = await Trade.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
  if (!trade) return res.status(404).json({ message: 'Trade not found.' });
  res.json(trade);
});

exports.deleteTrade = asyncHandler(async (req, res) => {
  await Trade.findByIdAndDelete(req.params.id);
  await CheckPoint.deleteMany({ tradeId: req.params.id });
  await TradeElement.deleteMany({ tradeId: req.params.id });
  res.json({ message: 'Trade deleted.' });
});

// ── CheckPoints ───────────────────────────────────────────────────────────────
exports.getCheckPoints = asyncHandler(async (req, res) => {
  const query = req.query.tradeId ? { tradeId: req.query.tradeId } : {};
  res.json(await CheckPoint.find(query).populate('tradeId', 'name').sort({ order: 1 }).lean());
});

exports.createCheckPoint = asyncHandler(async (req, res) => {
  res.status(201).json(await CheckPoint.create(req.body));
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
  const { status, projectId, floorId, includeResults } = req.query;
  const query = {};
  if (status)    query.status    = status;
  if (projectId) query.projectId = projectId;
  if (floorId)   query.floorId   = floorId;

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

// ── Users ─────────────────────────────────────────────────────────────────────
exports.getUsers = asyncHandler(async (_req, res) => {
  res.json(await User.find().sort({ createdAt: -1 }).lean());
});

exports.createUser = asyncHandler(async (req, res) => {
  const user = await User.create(req.body);
  res.status(201).json({ _id: user._id, name: user.name, email: user.email, role: user.role, createdAt: user.createdAt });
});

exports.updateUser = asyncHandler(async (req, res) => {
  const updates = { ...req.body };
  if (updates.password) {
    updates.password = await bcrypt.hash(updates.password, parseInt(process.env.BCRYPT_ROUNDS) || 12);
  } else {
    delete updates.password;
  }
  // Normalize role to array (findByIdAndUpdate bypasses Mongoose setters)
  if (updates.role !== undefined) {
    const arr = Array.isArray(updates.role) ? updates.role : [updates.role];
    updates.role = [...new Set(arr.map(r => String(r).toLowerCase().trim()).filter(Boolean))];
    if (updates.role.length === 0) updates.role = ['user'];
  }
  const user = await User.findByIdAndUpdate(req.params.id, updates, { new: true, runValidators: true });
  if (!user) return res.status(404).json({ message: 'User not found.' });
  res.json({ _id: user._id, name: user.name, email: user.email, role: user.role, createdAt: user.createdAt });
});

exports.deleteUser = asyncHandler(async (req, res) => {
  if (req.user._id.toString() === req.params.id)
    return res.status(400).json({ message: 'Cannot delete your own account.' });
  await User.findByIdAndDelete(req.params.id);
  res.json({ message: 'User deleted.' });
});
