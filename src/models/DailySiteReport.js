const { Schema, model } = require('mongoose');

const schema = new Schema({
  dri:                { type: String, required: true },
  project:            { type: String, required: true, trim: true },
  projectDescription: { type: String, required: true, trim: true },
  workType:           { type: String, required: true, trim: true },
  reportDateTime:     { type: Date,   required: true },
  photos:             [{ type: String }],
  status:             { type: String, enum: ['Pending', 'Reviewed'], default: 'Pending' },
}, { timestamps: true });

module.exports = model('DailySiteReport', schema);
