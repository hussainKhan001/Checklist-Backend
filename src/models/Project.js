const mongoose = require('mongoose');

const projectSchema = new mongoose.Schema({
  name:        { type: String, required: true },
  type:        { type: String, enum: ['RESIDENTIAL', 'COMMERCIAL_HOSPITALITY'], required: true },
  description: String,
  mapImage:    String,
  isHidden:    { type: Boolean, default: false },
  maps: [{
    name: { type: String, required: true },
    url: { type: String, required: true }
  }],
}, { timestamps: true });

module.exports = mongoose.model('Project', projectSchema);
