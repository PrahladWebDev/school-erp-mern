'use strict';
const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/teacherController');
const { protect, restrictTo, schoolBoundary } = require('../middleware/authMiddleware');
const { uploadTeacherPhoto } = require('../config/cloudinary');
const { validatePagination } = require('../middleware/validateMiddleware');

router.use(protect, schoolBoundary);

router.get('/salary-records', restrictTo('super_admin', 'school_admin'), ctrl.getSalaryRecords);
router.get('/', validatePagination, ctrl.getAllTeachers);
router.post('/', restrictTo('super_admin', 'school_admin'), ctrl.createTeacher);
router.get('/:id', ctrl.getTeacherById);
router.put('/:id', restrictTo('super_admin', 'school_admin'), ctrl.updateTeacher);
router.post('/:id/salary', restrictTo('super_admin', 'school_admin'), ctrl.addSalaryRecord);
router.post('/:id/photo', uploadTeacherPhoto.single('photo'), ctrl.uploadTeacherPhoto);

router.post('/:id/reset-credentials', restrictTo('super_admin', 'school_admin'), ctrl.resetTeacherCredentials);

module.exports = router;
