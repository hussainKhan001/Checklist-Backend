const asyncHandler = require('../middleware/asyncHandler');
const Trade = require('../models/Trade');

exports.getAll = asyncHandler(async (req, res) => {
  const query = req.query.elementId
    ? { elementId: req.query.elementId }
    : { $or: [{ elementId: null }, { elementId: { $exists: false } }] };
  res.json(await Trade.find(query).sort({ order: 1 }).lean());
});

exports.getOne = asyncHandler(async (req, res) => {
  const trade = await Trade.findById(req.params.id).lean();
  if (!trade) return res.status(404).json({ message: 'Trade not found.' });
  res.json(trade);
});
