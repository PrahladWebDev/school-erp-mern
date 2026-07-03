'use strict';
const express = require('express');
const router = express.Router();
const { classController: ctrl } = require('../controllers/miscControllers');
const { protect, restrictTo, schoolBoundary } = require('../middleware/authMiddleware');

router.use(protect, schoolBoundary);

router.get('/', ctrl.getAll);
router.post('/', restrictTo('super_admin', 'school_admin'), ctrl.create);
router.get('/:id', ctrl.getById);
router.put('/:id', restrictTo('super_admin', 'school_admin'), ctrl.update);
router.delete('/:id', restrictTo('super_admin', 'school_admin'), ctrl.delete);

module.exports = router;
