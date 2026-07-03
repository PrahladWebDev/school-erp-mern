'use strict';
const express = require('express');
const router = express.Router();
const { dashboardController: ctrl } = require('../controllers/miscControllers');
const { protect, restrictTo, schoolBoundary } = require('../middleware/authMiddleware');

router.use(protect, schoolBoundary);

router.get('/school-admin', restrictTo('super_admin', 'school_admin'), ctrl.getSchoolAdminDashboard);
router.get('/teacher', restrictTo('teacher'), ctrl.getTeacherDashboard);
router.get('/student', restrictTo('student'), ctrl.getStudentDashboard);

module.exports = router;
