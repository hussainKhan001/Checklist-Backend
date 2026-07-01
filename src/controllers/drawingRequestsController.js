const asyncHandler = require('../middleware/asyncHandler');
const DrawingRequest = require('../models/DrawingRequest');

// Public: submit a drawing request
exports.create = asyncHandler(async (req, res) => {
  const { project, drawingDescription, drawingType, dri, requestDate } = req.body;
  if (!project || !drawingDescription || !drawingType || !dri || !requestDate)
    return res.status(400).json({ message: 'All fields are required.' });

  const doc = await DrawingRequest.create({ project, drawingDescription, drawingType, dri, requestDate });
  res.status(201).json({ message: 'Drawing request submitted.', data: doc });
});

// Admin: list with filters + pagination
exports.getAll = asyncHandler(async (req, res) => {
  const { page = 1, limit = 50, status, drawingType, project, from, to } = req.query;
  const query = {};

  if (status)      query.status      = status;
  if (drawingType) query.drawingType = drawingType;
  if (project)     query.project     = { $regex: project, $options: 'i' };
  if (from || to) {
    query.requestDate = {};
    if (from) { const d = new Date(from); d.setUTCHours(0,0,0,0);       query.requestDate.$gte = d; }
    if (to)   { const d = new Date(to);   d.setUTCHours(23,59,59,999);   query.requestDate.$lte = d; }
  }

  const skip  = (Number(page) - 1) * Number(limit);
  const total = await DrawingRequest.countDocuments(query);
  const data  = await DrawingRequest.find(query)
    .sort({ requestDate: -1, createdAt: -1 })
    .skip(skip)
    .limit(Number(limit))
    .lean();

  res.json({ data, total, page: Number(page), pages: Math.ceil(total / Number(limit)) });
});

// Admin: update (status, remarks, or full record)
exports.updateStatus = asyncHandler(async (req, res) => {
  const allowed = ['project','drawingDescription','drawingType','dri','requestDate','status','remarks'];
  const update  = Object.fromEntries(Object.entries(req.body).filter(([k]) => allowed.includes(k)));
  const doc = await DrawingRequest.findByIdAndUpdate(req.params.id, update, { new: true });
  if (!doc) return res.status(404).json({ message: 'Not found.' });
  res.json({ data: doc });
});

// Admin: delete
exports.remove = asyncHandler(async (req, res) => {
  await DrawingRequest.findByIdAndDelete(req.params.id);
  res.json({ message: 'Deleted.' });
});
