const router = require('express').Router();
const requireAdmin = require('../middleware/requireAdmin');
const admin = require('../controllers/adminController');

router.use(requireAdmin);

router.get('/stats', admin.getStats);

router.get('/projects', admin.getProjects);
router.post('/projects', admin.createProject);
router.put('/projects/:id', admin.updateProject);
router.delete('/projects/:id', admin.deleteProject);

router.get('/floors', admin.getFloors);
router.post('/floors', admin.createFloor);
router.put('/floors/:id', admin.updateFloor);
router.delete('/floors/:id', admin.deleteFloor);

router.get('/locations', admin.getLocations);
router.post('/locations', admin.createLocation);
router.put('/locations/:id', admin.updateLocation);
router.delete('/locations/:id', admin.deleteLocation);

router.get('/elements', admin.getElements);
router.post('/elements', admin.createElement);
router.put('/elements/:id', admin.updateElement);
router.delete('/elements/:id', admin.deleteElement);

router.get('/trades', admin.getTrades);
router.post('/trades', admin.createTrade);
router.put('/trades/:id', admin.updateTrade);
router.delete('/trades/:id', admin.deleteTrade);

router.get('/checkpoints', admin.getCheckPoints);
router.post('/checkpoints', admin.createCheckPoint);
router.put('/checkpoints/:id', admin.updateCheckPoint);
router.delete('/checkpoints/:id', admin.deleteCheckPoint);

router.get('/inspections', admin.getInspections);
router.get('/inspections/:id', admin.getInspection);
router.put('/inspections/:id', admin.updateInspection);
router.delete('/inspections/:id', admin.deleteInspection);

router.get('/users', admin.getUsers);
router.post('/users', admin.createUser);
router.put('/users/:id', admin.updateUser);
router.delete('/users/:id', admin.deleteUser);

module.exports = router;
