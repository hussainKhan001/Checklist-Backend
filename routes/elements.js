const router = require('express').Router();
const asyncHandler = require('../middleware/asyncHandler');
const Element = require('../models/Element');

router.get('/', asyncHandler(async (req, res) => {
  const query = req.query.locationId ? { locationId: req.query.locationId } : {};
  res.json(await Element.find(query).sort({ type: 1, order: 1 }).lean());
}));

module.exports = router;
