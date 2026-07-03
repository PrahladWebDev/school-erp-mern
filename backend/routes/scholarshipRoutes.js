'use strict';
const express = require('express');
const router = express.Router();
const { protect, restrictTo, schoolBoundary } = require('../middleware/authMiddleware');
const AppError = require('../utils/AppError');

router.use(protect, schoolBoundary);

router.get('/', async (req, res, next) => {
  try {
    const { Scholarship } = req.tenantDb;
    const { academicYear, isActive } = req.query;
    const filter = {};
    if (academicYear) filter.academicYear = academicYear;
    if (isActive !== undefined) filter.isActive = isActive === 'true';
    const scholarships = await Scholarship.find(filter).sort({ createdAt: -1 }).lean();
    res.json({ success: true, data: { scholarships } });
  } catch (err) { next(err); }
});

router.post('/', restrictTo('super_admin', 'school_admin'), async (req, res, next) => {
  try {
    const { Scholarship } = req.tenantDb;
    const scholarship = await Scholarship.create({ ...req.body, createdBy: req.user._id });
    res.status(201).json({ success: true, message: 'Scholarship created', data: { scholarship } });
  } catch (err) { next(err); }
});

router.post('/:id/apply', async (req, res, next) => {
  try {
    const { Scholarship, Student } = req.tenantDb;
    const { studentId } = req.body;
    const student = await Student.findById(studentId).lean();
    if (!student) return next(new AppError('Student not found', 404));

    const scholarship = await Scholarship.findByIdAndUpdate(req.params.id, {
      $push: {
        applications: {
          studentId,
          studentName: `${student.firstName} ${student.lastName || ''}`.trim(),
          status: 'applied'
        }
      }
    }, { new: true });

    if (!scholarship) return next(new AppError('Scholarship not found', 404));
    res.json({ success: true, message: 'Application submitted', data: { scholarship } });
  } catch (err) { next(err); }
});

router.patch('/:id/applications/:applicationId', restrictTo('super_admin', 'school_admin'), async (req, res, next) => {
  try {
    const { Scholarship } = req.tenantDb;
    const { status, amountReceived, remarks } = req.body;
    const scholarship = await Scholarship.findOneAndUpdate(
      { _id: req.params.id, 'applications._id': req.params.applicationId },
      { $set: { 'applications.$.status': status, 'applications.$.amountReceived': amountReceived, 'applications.$.remarks': remarks } },
      { new: true }
    );
    if (!scholarship) return next(new AppError('Not found', 404));
    res.json({ success: true, message: 'Application updated', data: { scholarship } });
  } catch (err) { next(err); }
});

module.exports = router;
