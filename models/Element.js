const mongoose = require('mongoose');

const elementSchema = new mongoose.Schema({
  locationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Location', required: true },
  floorId:    { type: mongoose.Schema.Types.ObjectId, ref: 'Floor',    required: true },
  projectId:  { type: mongoose.Schema.Types.ObjectId, ref: 'Project',  required: true },
  name:  { type: String, required: true },
  type: {
    type: String,
    enum: ['WALL', 'COLUMN', 'BEAM', 'SLAB', 'DOOR_WINDOW_FRAME', 'STAIRCASE', 'OTHER'],
    required: true,
  },
  order: { type: Number, default: 0 },
}, { timestamps: true });

module.exports = mongoose.model('Element', elementSchema);
