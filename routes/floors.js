const router = require('express').Router();
const { getAll, getOne } = require('../controllers/floorController');

router.get('/', getAll);
router.get('/:id', getOne);

module.exports = router;
