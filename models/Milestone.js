const mongoose = require('mongoose');

const milestoneSchema = new mongoose.Schema({
  projectId:   { type: mongoose.Schema.Types.ObjectId, ref: 'Project', required: true },
  title:       { type: String, required: true, trim: true },
  description: { type: String, default: '' },
  targetDate:  { type: Date, required: true },
  completedAt: { type: Date, default: null },
  priority:    { type: String, enum: ['LOW', 'MEDIUM', 'HIGH'], default: 'MEDIUM' },
  floorId:     { type: mongoose.Schema.Types.ObjectId, ref: 'Floor', default: null },
  tradeId:     { type: mongoose.Schema.Types.ObjectId, ref: 'Trade', default: null },
}, { timestamps: true });

milestoneSchema.index({ projectId: 1, targetDate: 1 });

module.exports = mongoose.model('Milestone', milestoneSchema);
