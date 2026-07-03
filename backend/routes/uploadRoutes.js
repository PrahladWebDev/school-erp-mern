'use strict';
const express = require('express');
const router = express.Router();
const { protect, schoolBoundary } = require('../middleware/authMiddleware');
const { uploadDocument, deleteFile } = require('../config/cloudinary');

router.use(protect, schoolBoundary);

router.post('/document', uploadDocument.single('file'), (req, res, next) => {
  if (!req.file) return res.status(400).json({ success: false, message: 'No file uploaded' });
  res.json({ success: true, data: { url: req.file.path, publicId: req.file.filename, originalName: req.file.originalname } });
});

router.delete('/document/:publicId', async (req, res, next) => {
  try {
    await deleteFile(req.params.publicId);
    res.json({ success: true, message: 'File deleted' });
  } catch (err) { next(err); }
});

module.exports = router;
