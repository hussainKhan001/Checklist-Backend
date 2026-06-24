const mongoose = require('mongoose');

const resultSchema = new mongoose.Schema({
  checkPointId: { type: mongoose.Schema.Types.ObjectId, ref: 'CheckPoint', required: true },
  result: { type: String, enum: ['OK', 'NOT_OK', 'PENDING'], default: 'PENDING' },
  photos: [String],
  remarks: String,
});

const timelineSchema = new mongoose.Schema({
  event: { type: String, enum: ['DRAFT_CREATED', 'PHOTO_UPLOADED', 'SUBMITTED', 'APPROVED', 'REJECTED', 'REOPENED'], required: true },
  timestamp: { type: Date, default: Date.now },
  details: { type: String, default: '' },
  by: { type: String, default: '' },
}, { _id: false });

const inspectionSchema = new mongoose.Schema({
  projectId:        { type: mongoose.Schema.Types.ObjectId, ref: 'Project',  required: true },
  floorId:          { type: mongoose.Schema.Types.ObjectId, ref: 'Floor',    required: true },
  locationId:       { type: mongoose.Schema.Types.ObjectId, ref: 'Location', required: true },
  elementId:        { type: mongoose.Schema.Types.ObjectId, ref: 'Element' },
  tradeId:          { type: mongoose.Schema.Types.ObjectId, ref: 'Trade',    required: true },
  dateOfCheck:      { type: Date, default: Date.now },
  workNotes:        String,
  contractorAgency: String,
  checkedBy:        String,
  results:          [resultSchema],
  status:           { type: String, enum: ['DRAFT', 'SUBMITTED', 'APPROVED', 'REJECTED'], default: 'DRAFT' },
  submittedAt:      { type: Date, default: null },
  approvedAt:       { type: Date, default: null },
  reviewedBy:       { type: String, default: '' },
  reviewNotes:      { type: String, default: '' },
  timeline:         { type: [timelineSchema], default: [] },
}, { timestamps: true });

module.exports = mongoose.model('Inspection', inspectionSchema);
