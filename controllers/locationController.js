const asyncHandler = require('../middleware/asyncHandler');
const Location = require('../models/Location');

exports.getAll = asyncHandler(async (req, res) => {
  const query = req.query.floorId ? { floorId: req.query.floorId } : {};
  res.json(await Location.find(query).sort({ type: 1, name: 1 }).lean());
});
