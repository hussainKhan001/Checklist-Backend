const mongoose = require('mongoose');

const floorSchema = new mongoose.Schema({
  projectId: { type: mongoose.Schema.Types.ObjectId, ref: 'Project', required: true },
  code: { type: String, required: true },
  label: { type: String, required: true },
  order: { type: Number, default: 0 },
  isProjectLevel: { type: Boolean, default: false },
  mapImage: String,
}, { timestamps: true });

module.exports = mongoose.model('Floor', floorSchema);
