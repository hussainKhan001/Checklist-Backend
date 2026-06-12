const router = require('express').Router();
const { getAll } = require('../controllers/checkpointController');

router.get('/', getAll);

module.exports = router;
