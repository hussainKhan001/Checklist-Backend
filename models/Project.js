const mongoose = require('mongoose');

const projectSchema = new mongoose.Schema({
  name:        { type: String, required: true },
  type:        { type: String, enum: ['RESIDENTIAL', 'COMMERCIAL_HOSPITALITY'], required: true },
  description: String,
  mapImage:    String,
  isHidden:    { type: Boolean, default: false },
}, { timestamps: true });

module.exports = mongoose.model('Project', projectSchema);
