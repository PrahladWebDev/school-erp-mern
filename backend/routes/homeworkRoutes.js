'use strict';
const express = require('express');
const router = express.Router();
const { homeworkController: ctrl } = require('../controllers/miscControllers');
const { protect, schoolBoundary } = require('../middleware/authMiddleware');
const { uploadHomework } = require('../config/cloudinary');

router.use(protect, schoolBoundary);

router.get('/', ctrl.getAll);
router.post('/', uploadHomework.array('attachments', 5), ctrl.create);
router.get('/:id', ctrl.getById);
router.put('/:id', ctrl.update);
router.delete('/:id', ctrl.delete);

module.exports = router;
