const mongoose = require('mongoose');

const resultSchema = new mongoose.Schema({
  checkPointId: { type: mongoose.Schema.Types.ObjectId, ref: 'CheckPoint', required: true },
  result: { type: String, enum: ['OK', 'NOT_OK', 'PENDING'], default: 'PENDING' },
  photos: [String],
  remarks: String,
});

const inspectionSchema = new mongoose.Schema({
  projectId: { type: mongoose.Schema.Types.ObjectId, ref: 'Project', required: true },
  floorId: { type: mongoose.Schema.Types.ObjectId, ref: 'Floor', required: true },
  locationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Location', required: true },
  elementId:  { type: mongoose.Schema.Types.ObjectId, ref: 'Element' },
  tradeId: { type: mongoose.Schema.Types.ObjectId, ref: 'Trade', required: true },
  dateOfCheck: { type: Date, default: Date.now },
  contractorAgency: String,
  checkedBy: String,
  results: [resultSchema],
  signatures: {
    siteEngineer: String,
    contractorRep: String,
    projectManager: String,
  },
  status: { type: String, enum: ['DRAFT', 'SUBMITTED'], default: 'DRAFT' },
}, { timestamps: true });

module.exports = mongoose.model('Inspection', inspectionSchema);
