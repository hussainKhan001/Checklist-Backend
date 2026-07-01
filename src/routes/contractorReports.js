const router = require('express').Router();
const auth   = require('../middleware/auth');
const { create, update, remove } = require('../controllers/contractorReportController');

router.post('/',             create);         // public
router.patch('/:id',  auth,  update);         // admin
router.delete('/:id', auth,  remove);         // admin

module.exports = router;
