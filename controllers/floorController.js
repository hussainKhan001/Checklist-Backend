const asyncHandler = require('../middleware/asyncHandler');
const Floor = require('../models/Floor');

exports.getAll = asyncHandler(async (req, res) => {
  const query = req.query.projectId ? { projectId: req.query.projectId } : {};
  res.json(await Floor.find(query).sort({ order: 1 }).lean());
});

exports.getOne = asyncHandler(async (req, res) => {
  const floor = await Floor.findById(req.params.id).lean();
  if (!floor) return res.status(404).json({ message: 'Floor not found.' });
  res.json(floor);
});
