const router = require('express').Router();
const { getAll } = require('../controllers/locationController');

router.get('/', getAll);

module.exports = router;
