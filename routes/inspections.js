const router = require('express').Router();
const { getAll, getOne, create, update, submit } = require('../controllers/inspectionController');

router.get('/', getAll);
router.get('/:id', getOne);
router.post('/', create);
router.put('/:id', update);
router.post('/:id/submit', submit);

module.exports = router;
