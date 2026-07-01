const { Schema, model } = require('mongoose');

const schema = new Schema({
  project:            { type: String, required: true, trim: true },
  drawingDescription: { type: String, required: true, trim: true },
  drawingType:        { type: String, required: true },
  dri:                { type: String, required: true },
  requestDate:        { type: Date, required: true },
  status:             { type: String, enum: ['Pending', 'In Progress', 'Completed', 'Rejected'], default: 'Pending' },
  remarks:            { type: String, default: '' },
}, { timestamps: true });

module.exports = model('DrawingRequest', schema);
