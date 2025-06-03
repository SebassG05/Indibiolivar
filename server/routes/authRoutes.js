const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');

router.post('/register', authController.registerUser);
router.post('/login', authController.loginUser);
router.post('/reset-password', authController.resetPassword); // Add route for password reset
router.post('/google', authController.googleLogin); // Add route for Google login/signup
router.post('/verify-token', authController.verifyToken);

module.exports = router;
