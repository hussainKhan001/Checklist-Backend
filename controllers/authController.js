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
  const { _id, name, email, role } = req.user;
  res.json({ _id, name, email, role, permissions: [...req.permissions] });
};
