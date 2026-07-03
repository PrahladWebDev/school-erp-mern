'use strict';
const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/attendanceController');
const { protect, restrictTo, schoolBoundary } = require('../middleware/authMiddleware');
const { validate, SCHEMAS } = require('../middleware/validateMiddleware');

router.use(protect, schoolBoundary);

router.get('/today-summary', ctrl.getTodaySummary);
router.get('/monthly-report', ctrl.getMonthlyReport);
router.get('/student/:studentId', ctrl.getStudentAttendance);
router.get('/', ctrl.getAttendance);
router.post('/', restrictTo('super_admin', 'school_admin', 'teacher'), validate(SCHEMAS.markAttendance), ctrl.markAttendance);
router.post('/teacher', restrictTo('super_admin', 'school_admin'), ctrl.markTeacherAttendance);

module.exports = router;
