const router = require('express').Router();
const auth   = require('../middleware/auth');
const ctrl   = require('../controllers/dailySiteReportsController');

router.post('/',             ctrl.create);         // public
router.get('/',       auth,  ctrl.getAll);         // admin
router.patch('/:id',  auth,  ctrl.updateStatus);   // admin
router.delete('/:id', auth,  ctrl.remove);         // admin

module.exports = router;
