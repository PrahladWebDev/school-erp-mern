'use strict';
const express = require('express');
const router = express.Router();
const { protect, restrictTo, schoolBoundary } = require('../middleware/authMiddleware');
const User = require('../models/global/User');
const AppError = require('../utils/AppError');

router.use(protect, schoolBoundary);

// Parent portal - view children data
router.get('/children', async (req, res, next) => {
  try {
    const { Student } = req.tenantDb;
    const parent = await User.findById(req.user._id).lean();
    const children = await Student.find({
      'guardians.userId': req.user._id
    }).populate('class', 'name').lean();
    res.json({ success: true, data: { children } });
  } catch (err) { next(err); }
});

module.exports = router;
