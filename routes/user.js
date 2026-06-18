const router = require('express').Router();
const ctrl   = require('../controllers/userController');

// auth middleware is already applied in server.js for all /api/user/* routes.
// Each route declares its own required permission — no blanket gate.

const can = (perm) => (req, res, next) => {
  if (!req.can(perm)) return res.status(403).json({ message: 'Permission denied.' });
  next();
};

// Allow access when the user has ANY of the listed permissions
const canAny = (...perms) => (req, res, next) => {
  if (perms.some(p => req.can(p))) return next();
  return res.status(403).json({ message: 'Permission denied.' });
};

// ── Site navigation (view_sites OR submit_forms) ───────────────────────────────
// A read-only supervisor (view_sites only) can browse the project/trade tree.
// A field engineer (submit_forms) can also browse as part of the form flow.
router.get('/projects',       canAny('view_sites', 'submit_forms'), ctrl.getProjects);
router.get('/projects/:id',   canAny('view_sites', 'submit_forms'), ctrl.getProject);
router.get('/floors',         canAny('view_sites', 'submit_forms'), ctrl.getFloors);
router.get('/floors/:id',     canAny('view_sites', 'submit_forms'), ctrl.getFloor);
router.get('/locations',      canAny('view_sites', 'submit_forms'), ctrl.getLocations);
router.get('/elements',       canAny('view_sites', 'submit_forms'), ctrl.getElements);
router.get('/trade-elements', canAny('view_sites', 'submit_forms'), ctrl.getTradeElements);
router.get('/trades',         canAny('view_sites', 'submit_forms'), ctrl.getTrades);
router.get('/trades/:id',     canAny('view_sites', 'submit_forms'), ctrl.getTrade);
router.get('/checkpoints',    canAny('view_sites', 'submit_forms'), ctrl.getCheckPoints);

// ── Inspections — create, save and submit forms (submit_forms required) ────────
// Note: specific paths before :id to avoid routing conflict
router.get('/inspections/draft',            can('submit_forms'), ctrl.getDraft);
router.get('/inspections/check-duplicate',  can('submit_forms'), ctrl.checkDuplicate);
router.get('/inspections',                  can('submit_forms'), ctrl.getInspections);
router.get('/inspections/:id',              can('submit_forms'), ctrl.getInspection);
router.post('/inspections',                 can('submit_forms'), ctrl.createInspection);
router.put('/inspections/:id',              can('submit_forms'), ctrl.updateInspection);
router.post('/inspections/:id/submit',      can('submit_forms'), ctrl.submitInspection);

// ── Photo upload (upload_photo required) ──────────────────────────────────────
router.post('/upload', can('upload_photo'), ctrl.uploadPhoto);

module.exports = router;
