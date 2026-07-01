const router   = require('express').Router();
const admin    = require('../controllers/adminController');
const roles    = require('../controllers/roleController');
const matrix   = require('../controllers/matrixController');
const progress = require('../controllers/progressController');
const contractorReports = require('../controllers/contractorReportController');

// Inline permission guard — uses req.can() attached by auth middleware
const can = (perm) => (req, res, next) => {
  if (!req.can(perm)) return res.status(403).json({ message: 'Permission denied.' });
  next();
};

// ── Stats (dashboard) — requires view_dashboard ───────────────────────────────
router.get('/stats', can('view_dashboard'), admin.getStats);

// ── Wall Matrix ───────────────────────────────────────────────────────────────
router.get('/matrix',         can('view_inspections'), matrix.getMatrix);
router.get('/project-matrix', can('view_inspections'), matrix.getProjectMatrix);

// ── Inspections ───────────────────────────────────────────────────────────────
router.get('/inspections',                  can('view_inspections'),    admin.getInspections);
router.get('/inspections/:id',              can('view_inspections'),    admin.getInspection);
router.put('/inspections/:id',              can('manage_inspections'),  admin.updateInspection);
router.post('/inspections/:id/approve',     can('manage_inspections'),  admin.approveInspection);
router.post('/inspections/:id/reject',      can('manage_inspections'),  admin.rejectInspection);
router.delete('/inspections/:id',           can('manage_inspections'),  admin.deleteInspection);

// ── Projects ──────────────────────────────────────────────────────────────────
router.get('/projects',        can('view_projects'),    admin.getProjects);
router.post('/projects',       can('manage_projects'),  admin.createProject);
router.put('/projects/:id',    can('manage_projects'),  admin.updateProject);
router.delete('/projects/:id', can('manage_projects'),  admin.deleteProject);

// ── Floors ────────────────────────────────────────────────────────────────────
router.get('/floors',        can('view_projects'),  admin.getFloors);
router.post('/floors',       can('manage_floors'),  admin.createFloor);
router.put('/floors/:id',    can('manage_floors'),  admin.updateFloor);
router.delete('/floors/:id', can('manage_floors'),  admin.deleteFloor);

// ── Locations ─────────────────────────────────────────────────────────────────
router.get('/locations',        can('view_projects'),  admin.getLocations);
router.post('/locations',       can('manage_floors'),  admin.createLocation);
router.put('/locations/:id',    can('manage_floors'),  admin.updateLocation);
router.delete('/locations/:id', can('manage_floors'),  admin.deleteLocation);

// ── Elements ──────────────────────────────────────────────────────────────────
router.get('/elements',        can('view_projects'),  admin.getElements);
router.post('/elements',       can('manage_floors'),  admin.createElement);
router.put('/elements/:id',    can('manage_floors'),  admin.updateElement);
router.delete('/elements/:id', can('manage_floors'),  admin.deleteElement);

// ── Trade-Element assignments ─────────────────────────────────────────────────
router.get('/trade-elements',        can('view_projects'),  admin.getTradeElements);
router.post('/trade-elements',       can('manage_trades'),  admin.createTradeElement);
router.delete('/trade-elements/:id', can('manage_trades'),  admin.deleteTradeElement);

// ── Trades ────────────────────────────────────────────────────────────────────
router.get('/trades',        can('view_trades'),    admin.getTrades);
router.post('/trades',       can('manage_trades'),  admin.createTrade);
router.put('/trades/:id',    can('manage_trades'),  admin.updateTrade);
router.delete('/trades/:id', can('manage_trades'),  admin.deleteTrade);

// ── CheckPoints ───────────────────────────────────────────────────────────────
router.get('/checkpoints',        can('view_trades'),    admin.getCheckPoints);
router.post('/checkpoints',       can('manage_trades'),  admin.createCheckPoint);
router.put('/checkpoints/:id',    can('manage_trades'),  admin.updateCheckPoint);
router.delete('/checkpoints/:id', can('manage_trades'),  admin.deleteCheckPoint);

// ── Users ─────────────────────────────────────────────────────────────────────
router.get('/users',        can('manage_users'),  admin.getUsers);
router.post('/users',       can('manage_users'),  admin.createUser);
router.put('/users/:id',    can('manage_users'),  admin.updateUser);
router.delete('/users/:id', can('manage_users'),  admin.deleteUser);

// ── Roles & Permissions ───────────────────────────────────────────────────────
router.get('/roles',        can('manage_roles'),  roles.getRoles);
router.post('/roles',       can('manage_roles'),  roles.createRole);
router.put('/roles/:id',    can('manage_roles'),  roles.updateRole);
router.delete('/roles/:id', can('manage_roles'),  roles.deleteRole);

// ── Contractor Reports ────────────────────────────────────────────────────────
router.get('/contractor-reports',        can('view_inspections'),   contractorReports.getAll);
router.delete('/contractor-reports/:id', can('manage_inspections'), contractorReports.remove);

// ── Site Progress ─────────────────────────────────────────────────────────────
router.get('/progress/summary',           can('view_inspections'), progress.getSummary);
router.get('/progress/plans',             can('view_inspections'), progress.getPlans);
router.put('/progress/plans',             can('manage_inspections'), progress.upsertPlan);
router.delete('/progress/plans/:id',      can('manage_inspections'), progress.deletePlan);
router.get('/progress/milestones',        can('view_inspections'), progress.getMilestones);
router.post('/progress/milestones',       can('manage_inspections'), progress.createMilestone);
router.put('/progress/milestones/:id',    can('manage_inspections'), progress.updateMilestone);
router.delete('/progress/milestones/:id', can('manage_inspections'), progress.deleteMilestone);

module.exports = router;
