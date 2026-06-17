const mongoose = require('mongoose');

// Links a trade/work to a specific structural element that requires that work
const tradeElementSchema = new mongoose.Schema({
  tradeId:   { type: mongoose.Schema.Types.ObjectId, ref: 'Trade',    required: true },
  elementId: { type: mongoose.Schema.Types.ObjectId, ref: 'Element',  required: true },
}, { timestamps: true });

tradeElementSchema.index({ tradeId: 1, elementId: 1 }, { unique: true });

module.exports = mongoose.model('TradeElement', tradeElementSchema);
