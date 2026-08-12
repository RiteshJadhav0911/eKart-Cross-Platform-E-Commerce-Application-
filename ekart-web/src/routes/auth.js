const express = require('express');
const router = express.Router();
const { register, login, getMe, updateProfile } = require('../controllers/authController');
const { protect } = require('../middleware/auth');
const { authLimiter } = require('../middleware/rateLimiter');
const { validate, schemas } = require('../middleware/validate');

// Rate limiter + validation applied before controller on auth routes
router.post('/register', authLimiter, validate(schemas.registerSchema), register);
router.post('/login',    authLimiter, validate(schemas.loginSchema),    login);
router.get('/me',        protect, getMe);
router.patch('/profile', protect, updateProfile);

module.exports = router;
