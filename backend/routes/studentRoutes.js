'use strict';
const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/studentController');
const { protect, restrictTo, schoolBoundary } = require('../middleware/authMiddleware');
const { uploadStudentPhoto, uploadDocument } = require('../config/cloudinary');
const { validate, validatePagination, SCHEMAS } = require('../middleware/validateMiddleware');

router.use(protect, schoolBoundary);

router.get('/stats', restrictTo('super_admin', 'school_admin'), ctrl.getStudentStats);
router.post('/bulk-promote', restrictTo('super_admin', 'school_admin'), ctrl.bulkPromote);
router.get('/', validatePagination, ctrl.getAllStudents);
router.post('/', restrictTo('super_admin', 'school_admin'), validate(SCHEMAS.createStudent), ctrl.createStudent);
router.get('/:id', ctrl.getStudentById);
router.put('/:id', restrictTo('super_admin', 'school_admin'), ctrl.updateStudent);
router.delete('/:id', restrictTo('super_admin', 'school_admin'), ctrl.deleteStudent);
router.post('/:id/promote', restrictTo('super_admin', 'school_admin'), ctrl.promoteStudent);
router.post('/:id/transfer', restrictTo('super_admin', 'school_admin'), ctrl.transferStudent);
router.post('/:id/upload-photo', uploadStudentPhoto.single('photo'), ctrl.uploadPhoto);
router.post('/:id/documents', uploadDocument.single('document'), ctrl.uploadDocument);

router.post('/:id/reset-credentials', restrictTo('super_admin', 'school_admin'), ctrl.resetStudentCredentials);

module.exports = router;
