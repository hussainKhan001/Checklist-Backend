const asyncHandler = require('../middleware/asyncHandler');
const ContractorReport = require('../models/ContractorReport');

// Public: submit a report
exports.create = asyncHandler(async (req, res) => {
  const { email, contractorName, location, date, workType, shiftType, workerCount } = req.body;
  if (!contractorName || !location || !date || !workType || !shiftType || !workerCount)
    return res.status(400).json({ message: 'All fields are required.' });

  const report = await ContractorReport.create({
    email: email || '',
    contractorName, location, date, workType, shiftType,
    workerCount: Number(workerCount),
  });
  res.status(201).json(report);
});

// Admin: list reports with filters + pagination
exports.getAll = asyncHandler(async (req, res) => {
  const { contractorName, location, workType, shiftType, from, to, page = 1, limit = 50 } = req.query;
  const query = {};

  if (contractorName) query.contractorName = { $regex: contractorName, $options: 'i' };
  if (location)       query.location       = { $regex: location, $options: 'i' };
  if (workType)       query.workType       = { $regex: workType, $options: 'i' };
  if (shiftType)      query.shiftType      = shiftType;

  if (from || to) {
    query.date = {};
    if (from) { const d = new Date(from); d.setUTCHours(0,0,0,0); query.date.$gte = d; }
    if (to)   { const d = new Date(to);   d.setUTCHours(23,59,59,999); query.date.$lte = d; }
  }

  const skip  = (Number(page) - 1) * Number(limit);
  const total = await ContractorReport.countDocuments(query);
  const data  = await ContractorReport.find(query)
    .sort({ date: -1, createdAt: -1 })
    .skip(skip)
    .limit(Number(limit))
    .lean();

  res.json({ data, total, page: Number(page), pages: Math.ceil(total / Number(limit)) });
});

// Admin: update a report
exports.update = asyncHandler(async (req, res) => {
  const { email, contractorName, location, date, workType, shiftType, workerCount } = req.body;
  const doc = await ContractorReport.findByIdAndUpdate(
    req.params.id,
    { email: email || '', contractorName, location, date, workType, shiftType, workerCount: Number(workerCount) },
    { new: true }
  );
  if (!doc) return res.status(404).json({ message: 'Not found.' });
  res.json({ data: doc });
});

// Admin: delete a report
exports.remove = asyncHandler(async (req, res) => {
  await ContractorReport.findByIdAndDelete(req.params.id);
  res.json({ message: 'Report deleted.' });
});
