const asyncHandler = require('../middleware/asyncHandler');
const Project = require('../models/Project');

exports.getAll = asyncHandler(async (_req, res) => {
  res.json(await Project.find().sort({ type: 1, name: 1 }).lean());
});

exports.getOne = asyncHandler(async (req, res) => {
  const project = await Project.findById(req.params.id).lean();
  if (!project) return res.status(404).json({ message: 'Project not found.' });
  res.json(project);
});

exports.create = asyncHandler(async (req, res) => {
  res.status(201).json(await Project.create(req.body));
});
