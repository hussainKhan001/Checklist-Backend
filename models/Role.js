const mongoose = require('mongoose');

const roleSchema = new mongoose.Schema({
  name:        { type: String, required: true, unique: true, lowercase: true, trim: true },
  displayName: { type: String, required: true },
  permissions: [{ type: String }],
  color:       { type: String, default: 'gray' },   // orange | blue | green | purple | red | gray
  isSystem:    { type: Boolean, default: false },    // system roles cannot be deleted
}, { timestamps: true });

module.exports = mongoose.model('Role', roleSchema);
