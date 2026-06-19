const router        = require('express').Router();
const authMiddleware = require('../middleware/auth');
const upload         = require('../middleware/upload');
const { login, getMe, updateProfile, updatePassword, updateAvatar } = require('../controllers/authController');

router.post('/login',   login);
router.get('/me',       authMiddleware, getMe);
router.patch('/profile', authMiddleware, updateProfile);
router.patch('/password', authMiddleware, updatePassword);
router.post('/avatar',   authMiddleware, upload.single('avatar'), updateAvatar);

module.exports = router;
