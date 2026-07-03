'use strict';
const express = require('express');
const router = express.Router();
const { leaveController: ctrl } = require('../controllers/miscControllers');
const { protect, restrictTo, schoolBoundary } = require('../middleware/authMiddleware');

router.use(protect, schoolBoundary);

router.get('/', ctrl.getAll);
router.post('/', ctrl.apply);
router.patch('/:id/approve', restrictTo('super_admin', 'school_admin', 'teacher'), ctrl.approve);

module.exports = router;
