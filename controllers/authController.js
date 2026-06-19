const jwt          = require('jsonwebtoken');
const asyncHandler = require('../middleware/asyncHandler');
const User         = require('../models/User');
const Role         = require('../models/Role');

// Merge permissions from one or many role names (used at login, before the cache warms)
async function loadPermissions(roleOrRoles) {
  const roles  = Array.isArray(roleOrRoles) ? roleOrRoles : [roleOrRoles];
  const merged = new Set();
  for (const name of roles) {
    if (!name) continue;
    const doc = await Role.findOne({ name: name.toLowerCase() }).lean();
    if (doc) doc.permissions.forEach(p => merged.add(p));
  }
  return [...merged];
}

exports.login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password)
    return res.status(400).json({ message: 'Email and password are required.' });

  const user = await User.findOne({ email: email.toLowerCase().trim() }).select('+password');
  if (!user || !(await user.comparePassword(password)))
    return res.status(401).json({ message: 'Invalid email or password.' });

  const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  });

  const permissions = await loadPermissions(user.role);
  res.json({
    token,
    user: { _id: user._id, name: user.name, email: user.email, role: user.role, permissions },
  });
});

exports.getMe = (req, res) => {
  const { _id, name, email, role, avatar } = req.user;
  res.json({ _id, name, email, role, avatar, permissions: [...req.permissions] });
};

exports.updateProfile = asyncHandler(async (req, res) => {
  const { name } = req.body;
  if (!name || !name.trim())
    return res.status(400).json({ message: 'Name is required.' });
  const user = await User.findByIdAndUpdate(
    req.user._id, { name: name.trim() }, { new: true }
  );
  res.json({ name: user.name });
});

exports.updatePassword = asyncHandler(async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  if (!currentPassword || !newPassword)
    return res.status(400).json({ message: 'Both fields are required.' });
  if (newPassword.length < 6)
    return res.status(400).json({ message: 'New password must be at least 6 characters.' });

  const user = await User.findById(req.user._id).select('+password');
  if (!(await user.comparePassword(currentPassword)))
    return res.status(400).json({ message: 'Current password is incorrect.' });

  user.password = newPassword;
  await user.save();
  res.json({ message: 'Password updated successfully.' });
});

exports.updateAvatar = asyncHandler(async (req, res) => {
  if (!req.file) return res.status(400).json({ message: 'No file uploaded.' });
  const user = await User.findByIdAndUpdate(
    req.user._id, { avatar: req.file.path }, { new: true }
  );
  res.json({ avatar: user.avatar });
});
