const Role = require('../models/Role');
const User = require('../models/User');

const DEFAULT_ROLES = [
  {
    name: 'admin',
    displayName: 'Admin',
    color: 'orange',
    isSystem: true,
    permissions: [
      'admin_access', 'view_dashboard',
      'view_inspections', 'view_projects', 'view_trades',
      'manage_users', 'manage_roles',
      'manage_projects', 'manage_floors', 'manage_trades', 'manage_inspections',
      'view_sites', 'submit_forms', 'upload_photo',
    ],
  },
  {
    name: 'supervisor',
    displayName: 'Supervisor',
    color: 'blue',
    isSystem: true,
    permissions: [
      'admin_access', 'view_dashboard',
      'view_inspections', 'view_projects', 'view_trades',
      'view_sites',
    ],
  },
  {
    name: 'user',
    displayName: 'Engineer',
    color: 'gray',
    isSystem: true,
    permissions: ['view_sites', 'submit_forms', 'upload_photo'],
  },
];

module.exports = async function seedRoles() {
  // ── Migration: convert legacy string role → array ─────────────────────────
  // findByIdAndUpdate bypasses Mongoose setters, so we do this explicitly.
  const legacyUsers = await User.find({ role: { $type: 'string' } }).lean();
  if (legacyUsers.length > 0) {
    await Promise.all(
      legacyUsers.map(u => User.updateOne({ _id: u._id }, { $set: { role: [u.role] } }))
    );
    console.log(`[MIGRATE] ${legacyUsers.length} user(s): role string → array`);
  }

  // ── Seed / sync system roles ──────────────────────────────────────────────
  // We use $addToSet so NEW permissions from the code are added on deploy,
  // but permissions an admin REMOVED from a system role are preserved.
  // Structural fields (displayName, color, isSystem) are always kept in sync.
  for (const role of DEFAULT_ROLES) {
    const existing = await Role.findOne({ name: role.name });
    if (!existing) {
      await Role.create(role);
      console.log(`[SEED] Role created: ${role.name}`);
    } else {
      await Role.updateOne(
        { name: role.name },
        {
          $set:      { displayName: role.displayName, color: role.color, isSystem: true },
          $addToSet: { permissions: { $each: role.permissions } },
        }
      );
    }
  }
};
