const mongoose = require('mongoose');

const tradeSchema = new mongoose.Schema({
  name:         { type: String, required: true },
  isHoldPoint:  { type: Boolean, default: false },
  whyItMatters: String,
  isPending:    { type: Boolean, default: false },
  isHidden:     { type: Boolean, default: false },
  isRecurring:  { type: Boolean, default: false },
  order:        { type: Number, default: 0 },
  elementId:    { type: mongoose.Schema.Types.ObjectId, ref: 'Element', default: null },
}, { timestamps: true });

module.exports = mongoose.model('Trade', tradeSchema);
