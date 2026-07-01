const mongoose = require('mongoose');

const contractorReportSchema = new mongoose.Schema({
  email:          { type: String, default: '' },
  contractorName: { type: String, required: true, trim: true },
  location:       { type: String, required: true, trim: true },
  date:           { type: Date, required: true },
  workType:       { type: String, required: true, trim: true },
  shiftType:      { type: String, required: true, enum: ['Day', 'Night', '24-Hour'] },
  workerCount:    { type: Number, required: true, min: 1 },
}, { timestamps: true });

contractorReportSchema.index({ date: -1 });
contractorReportSchema.index({ contractorName: 1, date: -1 });

module.exports = mongoose.model('ContractorReport', contractorReportSchema);
