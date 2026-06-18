const PERMISSIONS = [
  // Admin Panel Access
  { key: 'admin_access',        group: 'Admin Panel',     label: 'Access Admin Panel' },
  { key: 'view_dashboard',      group: 'Admin Panel',     label: 'View Dashboard Stats' },
  { key: 'view_inspections',    group: 'Admin Panel',     label: 'View Inspections' },
  { key: 'view_projects',       group: 'Admin Panel',     label: 'View Projects & Floors' },
  { key: 'view_trades',         group: 'Admin Panel',     label: 'View Trades & Checkpoints' },

  // Management (write operations)
  { key: 'manage_users',        group: 'Management',      label: 'Manage Users' },
  { key: 'manage_roles',        group: 'Management',      label: 'Manage Roles & Permissions' },
  { key: 'manage_projects',     group: 'Management',      label: 'Add / Edit / Delete Projects' },
  { key: 'manage_floors',       group: 'Management',      label: 'Add / Edit / Delete Floors & Locations' },
  { key: 'manage_trades',       group: 'Management',      label: 'Add / Edit / Delete Trades & Checkpoints' },
  { key: 'manage_inspections',  group: 'Management',      label: 'Edit / Delete Inspections' },

  // Site Operations
  { key: 'submit_forms',        group: 'Site Operations', label: 'Submit Inspection Forms' },
];

module.exports = PERMISSIONS;
