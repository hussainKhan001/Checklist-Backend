const router = require('express').Router();
const authMiddleware = require('../middleware/auth');
const { login, getMe } = require('../controllers/authController');

router.post('/login', login);
router.get('/me', authMiddleware, getMe);

module.exports = router;
