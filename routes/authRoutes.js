const express = require('express');
const router = express.Router();
const {
  login,
  registerraw,
  getMe,
  sendOtp,
  register
} = require('../controllers/authController');
const authMiddleware = require('../middleware/authMiddleware');

router.post('/login', login);
router.post('/registerraw', registerraw);
router.get('/me', authMiddleware, getMe);
router.post('/send-otp', sendOtp);
router.post('/register', register);

module.exports = router;
