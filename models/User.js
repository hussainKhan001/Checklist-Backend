const mongoose = require('mongoose');
const bcrypt   = require('bcryptjs');

const userSchema = new mongoose.Schema({
  name:     { type: String, required: true },
  email:    { type: String, required: true, unique: true, lowercase: true, trim: true },
  password: { type: String, required: true, select: false },

  // Array — a user can hold multiple roles; permissions are merged at auth time
  role: {
    type: [String],
    default: ['user'],
    set: function (v) {
      const arr = Array.isArray(v) ? v : [String(v)];
      const cleaned = [...new Set(arr.map(r => String(r).toLowerCase().trim()).filter(Boolean))];
      return cleaned.length ? cleaned : ['user'];
    },
  },
}, { timestamps: true });

userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, parseInt(process.env.BCRYPT_ROUNDS) || 12);
  next();
});

userSchema.methods.comparePassword = function (plain) {
  return bcrypt.compare(plain, this.password);
};

module.exports = mongoose.model('User', userSchema);
