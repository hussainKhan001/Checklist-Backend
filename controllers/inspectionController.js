const asyncHandler = require('../middleware/asyncHandler');
const Inspection = require('../models/Inspection');

exports.getAll = asyncHandler(async (_req, res) => {
  res.json(await Inspection.find()
    .populate('projectId', 'name')
    .populate('floorId', 'code label')
    .populate('locationId', 'name')
    .populate('tradeId', 'name')
    .sort({ createdAt: -1 })
    .lean());
});

exports.getOne = asyncHandler(async (req, res) => {
  const inspection = await Inspection.findById(req.params.id)
    .populate('projectId')
    .populate('floorId')
    .populate('locationId')
    .populate('tradeId')
    .populate('results.checkPointId');
  if (!inspection) return res.status(404).json({ message: 'Inspection not found.' });
  res.json(inspection);
});

exports.create = asyncHandler(async (req, res) => {
  res.status(201).json(await Inspection.create(req.body));
});

exports.update = asyncHandler(async (req, res) => {
  const inspection = await Inspection.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
  if (!inspection) return res.status(404).json({ message: 'Inspection not found.' });
  res.json(inspection);
});

exports.submit = asyncHandler(async (req, res) => {
  const inspection = await Inspection.findByIdAndUpdate(
    req.params.id,
    { ...req.body, status: 'SUBMITTED' },
    { new: true, runValidators: true }
  );
  if (!inspection) return res.status(404).json({ message: 'Inspection not found.' });
  res.json(inspection);
});
