'use strict';

const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { protect } = require('../middleware/authMiddleware');
const { validate, SCHEMAS } = require('../middleware/validateMiddleware');

router.post('/login', validate(SCHEMAS.login), authController.login);
router.post('/refresh', authController.refreshToken);
router.post('/forgot-password', authController.forgotPassword);
router.post('/reset-password/:token', authController.resetPassword);

// Protected
router.use(protect);
router.get('/me', authController.getMe);
router.post('/logout', authController.logout);
router.put('/change-password', authController.changePassword);
router.put('/update-profile', authController.updateProfile);

module.exports = router;
