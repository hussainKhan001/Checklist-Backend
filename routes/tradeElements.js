const router = require('express').Router();
const asyncHandler = require('../middleware/asyncHandler');
const TradeElement = require('../models/TradeElement');
const Element = require('../models/Element');

// GET /api/trade-elements?tradeId=:id&locationId=:id
// Returns elements assigned to this trade, filtered to the given location
router.get('/', asyncHandler(async (req, res) => {
  const { tradeId, locationId } = req.query;
  if (!tradeId) return res.status(400).json({ message: 'tradeId required.' });

  const assignments = await TradeElement.find({ tradeId })
    .populate('elementId')
    .lean();

  let elements = assignments.map(a => a.elementId).filter(Boolean);
  if (locationId) elements = elements.filter(e => e.locationId?.toString() === locationId);

  res.json(elements);
}));

module.exports = router;
