'use strict';
const express = require('express');
const router = express.Router();
const School = require('../models/global/School');
const { protect, restrictTo } = require('../middleware/authMiddleware');
const { uploadSchoolLogo } = require('../config/cloudinary');
const { clearTenantCacheEntry } = require('../config/database');
const AppError = require('../utils/AppError');

router.use(protect);

router.get('/my-school', async (req, res, next) => {
  try {
    if (!req.user.schoolId) return next(new AppError('No school associated', 404));
    const school = await School.findById(req.user.schoolId).select('-dbUri');
    if (!school) return next(new AppError('School not found', 404));
    res.json({ success: true, data: { school } });
  } catch (err) { next(err); }
});

router.put('/my-school', restrictTo('school_admin', 'super_admin'), async (req, res, next) => {
  try {
    const allowed = ['name','email','phone','address','medium','board','workingDays','primaryColor','secondaryColor','currentAcademicYear','shortName'];
    const updates = {};
    allowed.forEach(f => { if (req.body[f] !== undefined) updates[f] = req.body[f]; });
    const school = await School.findByIdAndUpdate(req.user.schoolId, updates, { new: true }).select('-dbUri');
    if (!school) return next(new AppError('School not found', 404));

    // Clear stale tenant DB connection cache so next request picks up fresh data
    await clearTenantCacheEntry(req.user.schoolId.toString());

    res.json({ success: true, message: 'School updated', data: { school } });
  } catch (err) { next(err); }
});

router.post('/my-school/logo', restrictTo('school_admin','super_admin'), uploadSchoolLogo.single('logo'), async (req, res, next) => {
  try {
    if (!req.file) return next(new AppError('No logo uploaded', 400));
    const school = await School.findByIdAndUpdate(req.user.schoolId, { logo: { url: req.file.path, publicId: req.file.filename } }, { new: true }).select('-dbUri');
    res.json({ success: true, message: 'Logo updated', data: { logo: school.logo } });
  } catch (err) { next(err); }
});

module.exports = router;
