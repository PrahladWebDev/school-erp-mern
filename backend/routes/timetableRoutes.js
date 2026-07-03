'use strict';
const express = require('express');
const router = express.Router();
const { timetableController: ctrl } = require('../controllers/miscControllers');
const { protect, restrictTo, schoolBoundary } = require('../middleware/authMiddleware');

router.use(protect, schoolBoundary);

// Dedicated route: students fetch their own timetable without knowing classId
router.get('/my', ctrl.getMyTimetable);
router.get('/', ctrl.getByClass);
router.post('/', restrictTo('super_admin', 'school_admin'), ctrl.create);

module.exports = router;
