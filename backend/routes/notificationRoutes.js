'use strict';
const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/notificationController');
const { protect, restrictTo, schoolBoundary } = require('../middleware/authMiddleware');

router.use(protect, schoolBoundary);

router.get('/', ctrl.getAll);
router.get('/unread-count', ctrl.getUnreadCount);
router.patch('/mark-all-read', ctrl.markAllRead);
router.patch('/:id/read', ctrl.markRead);
router.post('/', restrictTo('super_admin', 'school_admin', 'teacher'), ctrl.create);
router.delete('/:id', restrictTo('super_admin', 'school_admin'), ctrl.delete);

module.exports = router;
