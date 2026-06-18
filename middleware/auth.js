const jwt  = require('jsonwebtoken');
const User = require('../models/User');
const Role = require('../models/Role');

// ── Per-role permission cache (5 min TTL) ─────────────────────────────────────
const roleCache = new Map();
const CACHE_TTL = 5 * 60 * 1000;

async function getPermissions(roleName) {
  const key = roleName.toLowerCase();
  const cached = roleCache.get(key);
  if (cached && Date.now() < cached.expiry) return cached.set;

  const doc = await Role.findOne({ name: key }).lean();
  const set = new Set(doc ? doc.permissions : []);
  roleCache.set(key, { set, expiry: Date.now() + CACHE_TTL });
  return set;
}

// Merge permissions from all roles a user holds
async function getMergedPermissions(roleOrRoles) {
  const roles = Array.isArray(roleOrRoles) ? roleOrRoles : [roleOrRoles];
  const merged = new Set();
  for (const role of roles) {
    if (!role) continue;
    const perms = await getPermissions(role); // each role is cached individually
    perms.forEach(p => merged.add(p));
  }
  return merged;
}

function clearRoleCache(roleName) {
  if (roleName) roleCache.delete(String(roleName).toLowerCase());
  else roleCache.clear();
}

module.exports = async (req, res, next) => {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer '))
    return res.status(401).json({ message: 'No token provided' });

  const token = header.split(' ')[1];
  try {
    const decoded  = jwt.verify(token, process.env.JWT_SECRET);
    req.user       = await User.findById(decoded.id).select('-password');
    if (!req.user) return res.status(401).json({ message: 'User not found' });

    req.permissions = await getMergedPermissions(req.user.role);
    req.can         = (perm) => req.permissions.has(perm);

    next();
  } catch {
    res.status(401).json({ message: 'Invalid or expired token' });
  }
};

module.exports.clearRoleCache = clearRoleCache;
