const asyncHandler = require('../middleware/asyncHandler');
const CheckPoint = require('../models/CheckPoint');

exports.getAll = asyncHandler(async (req, res) => {
  const query = req.query.tradeId ? { tradeId: req.query.tradeId } : {};
  res.json(await CheckPoint.find(query).sort({ order: 1 }).lean());
});
