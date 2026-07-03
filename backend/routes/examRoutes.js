'use strict';
const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/examController');
const { protect, restrictTo, schoolBoundary } = require('../middleware/authMiddleware');

router.use(protect, schoolBoundary);

router.get('/', ctrl.getAllExams);
router.post('/', restrictTo('super_admin', 'school_admin'), ctrl.createExam);
router.get('/results', ctrl.getResults);
router.get('/:id', ctrl.getExamById);
router.put('/:id', restrictTo('super_admin', 'school_admin'), ctrl.updateExam);
router.post('/:examId/marks', restrictTo('super_admin', 'school_admin'), ctrl.enterMarks);
router.post('/:examId/publish', restrictTo('super_admin', 'school_admin'), ctrl.publishResults);
router.get('/:examId/analysis', ctrl.getClassResultAnalysis);
router.get('/:examId/report-card/:studentId', ctrl.generateReportCard);

module.exports = router;
