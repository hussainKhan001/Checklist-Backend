const mongoose = require('mongoose');

const progressPlanSchema = new mongoose.Schema({
  projectId:    { type: mongoose.Schema.Types.ObjectId, ref: 'Project', required: true },
  floorId:      { type: mongoose.Schema.Types.ObjectId, ref: 'Floor',   required: true },
  tradeId:      { type: mongoose.Schema.Types.ObjectId, ref: 'Trade',   required: true },
  plannedStart: { type: Date, default: null },
  plannedEnd:   { type: Date, default: null },
  notes:        { type: String, default: '' },
}, { timestamps: true });

progressPlanSchema.index({ projectId: 1, floorId: 1, tradeId: 1 }, { unique: true });

module.exports = mongoose.model('ProgressPlan', progressPlanSchema);
