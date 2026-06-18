const asyncHandler     = require('../middleware/asyncHandler');
const Role             = require('../models/Role');
const User             = require('../models/User');
const { clearRoleCache } = require('../middleware/auth');

// ── Get all roles with per-role user count ────────────────────────────────────
exports.getRoles = asyncHandler(async (req, res) => {
  const roles = await Role.find({}).sort({ createdAt: 1 }).lean();

  // Unwind role arrays so each role name is counted separately
  const counts = await User.aggregate([
    { $unwind: '$role' },
    { $group: { _id: '$role', count: { $sum: 1 } } },
  ]);
  const countMap = Object.fromEntries(counts.map(c => [c._id, c.count]));

  res.json(roles.map(r => ({ ...r, userCount: countMap[r.name] || 0 })));
});

// ── Create role ───────────────────────────────────────────────────────────────
exports.createRole = asyncHandler(async (req, res) => {
  const { name, displayName, permissions = [], color = 'gray' } = req.body;
  if (!name || !displayName)
    return res.status(400).json({ message: 'name and displayName are required.' });

  // ── Privilege escalation guard ─────────────────────────────────────────────
  const escalated = permissions.filter(p => !req.can(p));
  if (escalated.length > 0)
    return res.status(403).json({ message: `Cannot grant permissions you don't have: ${escalated.join(', ')}` });

  const role = await Role.create({ name, displayName, permissions, color, isSystem: false });
  clearRoleCache(role.name);
  res.status(201).json(role);
});

// ── Update role ───────────────────────────────────────────────────────────────
exports.updateRole = asyncHandler(async (req, res) => {
  const role = await Role.findById(req.params.id);
  if (!role) return res.status(404).json({ message: 'Role not found.' });

  const { displayName, permissions, color } = req.body;

  // ── Privilege escalation guard ─────────────────────────────────────────────
  if (permissions !== undefined) {
    const escalated = permissions.filter(p => !req.can(p));
    if (escalated.length > 0)
      return res.status(403).json({ message: `Cannot grant permissions you don't have: ${escalated.join(', ')}` });
    role.permissions = permissions;
  }

  if (displayName !== undefined) role.displayName = displayName;
  if (color        !== undefined) role.color       = color;

  await role.save();
  clearRoleCache(role.name);
  res.json(role);
});

// ── Delete role (cascade → reassign users) ────────────────────────────────────
exports.deleteRole = asyncHandler(async (req, res) => {
  const role = await Role.findById(req.params.id);
  if (!role) return res.status(404).json({ message: 'Role not found.' });
  if (role.isSystem) return res.status(400).json({ message: 'System roles cannot be deleted.' });

  // Remove this role from every user's role array
  const affected = await User.countDocuments({ role: role.name });
  if (affected > 0) {
    await User.updateMany({ role: role.name }, { $pull: { role: role.name } });
    // Any user now with an empty roles array falls back to the default
    await User.updateMany({ role: { $size: 0 } }, { $set: { role: ['user'] } });
  }

  await role.deleteOne();
  clearRoleCache(role.name);
  res.json({
    message: `Role "${role.displayName}" deleted.${affected > 0 ? ` ${affected} user(s) reassigned to Engineer.` : ''}`,
  });
});
