const asyncHandler = require('../middleware/asyncHandler');
const DailySiteReport = require('../models/DailySiteReport');

// Public: submit a daily site report
exports.create = asyncHandler(async (req, res) => {
  const { dri, project, projectDescription, workType, photos } = req.body;
  if (!dri || !project || !projectDescription || !workType)
    return res.status(400).json({ message: 'All fields are required.' });

  const doc = await DailySiteReport.create({
    dri, project, projectDescription, workType,
    photos: Array.isArray(photos) ? photos : [],
    reportDateTime: new Date(),
  });
  res.status(201).json({ message: 'Report submitted.', data: doc });
});

// Admin: list with filters + pagination
exports.getAll = asyncHandler(async (req, res) => {
  const { page = 1, limit = 50, project, dri, status, from, to } = req.query;
  const query = {};

  if (project) query.project = { $regex: project, $options: 'i' };
  if (dri)     query.dri     = { $regex: dri,     $options: 'i' };
  if (status)  query.status  = status;
  if (from || to) {
    query.reportDateTime = {};
    if (from) { const d = new Date(from); d.setUTCHours(0,0,0,0);       query.reportDateTime.$gte = d; }
    if (to)   { const d = new Date(to);   d.setUTCHours(23,59,59,999);   query.reportDateTime.$lte = d; }
  }

  const skip  = (Number(page) - 1) * Number(limit);
  const total = await DailySiteReport.countDocuments(query);
  const data  = await DailySiteReport.find(query)
    .sort({ reportDateTime: -1 })
    .skip(skip)
    .limit(Number(limit))
    .lean();

  res.json({ data, total, page: Number(page), pages: Math.ceil(total / Number(limit)) });
});

// Admin: update (status or full record)
exports.updateStatus = asyncHandler(async (req, res) => {
  const allowed = ['dri','project','projectDescription','workType','status','photos'];
  const update  = Object.fromEntries(Object.entries(req.body).filter(([k]) => allowed.includes(k)));
  const doc = await DailySiteReport.findByIdAndUpdate(req.params.id, update, { new: true });
  if (!doc) return res.status(404).json({ message: 'Not found.' });
  res.json({ data: doc });
});

// Admin: delete
exports.remove = asyncHandler(async (req, res) => {
  await DailySiteReport.findByIdAndDelete(req.params.id);
  res.json({ message: 'Deleted.' });
});
