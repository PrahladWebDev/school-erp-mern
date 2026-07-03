'use strict';

const cloudinary = require('cloudinary').v2;
const multer = require('multer');
const { CloudinaryStorage } = require('multer-storage-cloudinary');

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

// ─── Student Photo Storage ─────────────────────────────────────────────────────
const studentPhotoStorage = new CloudinaryStorage({
  cloudinary,
  params: async (req, file) => ({
    folder: `school_erp/${req.schoolId}/students`,
    allowed_formats: ['jpg', 'jpeg', 'png', 'webp'],
    transformation: [{ width: 300, height: 300, crop: 'fill', gravity: 'face' }],
    public_id: `student_${Date.now()}`
  })
});

// ─── Teacher Photo Storage ─────────────────────────────────────────────────────
const teacherPhotoStorage = new CloudinaryStorage({
  cloudinary,
  params: async (req, file) => ({
    folder: `school_erp/${req.schoolId}/teachers`,
    allowed_formats: ['jpg', 'jpeg', 'png', 'webp'],
    transformation: [{ width: 300, height: 300, crop: 'fill', gravity: 'face' }],
    public_id: `teacher_${Date.now()}`
  })
});

// ─── School Logo Storage ───────────────────────────────────────────────────────
const schoolLogoStorage = new CloudinaryStorage({
  cloudinary,
  params: async (req, file) => ({
    folder: 'school_erp/logos',
    allowed_formats: ['jpg', 'jpeg', 'png', 'webp', 'svg'],
    transformation: [{ width: 200, height: 200, crop: 'pad', background: 'white' }],
    public_id: `logo_${req.params.schoolId || Date.now()}`
  })
});

// ─── Document Storage ──────────────────────────────────────────────────────────
const documentStorage = new CloudinaryStorage({
  cloudinary,
  params: async (req, file) => ({
    folder: `school_erp/${req.schoolId}/documents`,
    allowed_formats: ['jpg', 'jpeg', 'png', 'pdf'],
    resource_type: 'auto',
    public_id: `doc_${Date.now()}`
  })
});

// ─── Homework Attachment Storage ───────────────────────────────────────────────
const homeworkStorage = new CloudinaryStorage({
  cloudinary,
  params: async (req, file) => ({
    folder: `school_erp/${req.schoolId}/homework`,
    allowed_formats: ['jpg', 'jpeg', 'png', 'pdf', 'doc', 'docx'],
    resource_type: 'auto',
    public_id: `hw_${Date.now()}`
  })
});

// ─── Multer Upload Instances ───────────────────────────────────────────────────
const fileFilter = (allowedTypes) => (req, file, cb) => {
  const allowed = allowedTypes || ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
  if (allowed.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error(`Invalid file type. Allowed: ${allowed.join(', ')}`), false);
  }
};

const uploadStudentPhoto = multer({
  storage: studentPhotoStorage,
  limits: { fileSize: 2 * 1024 * 1024 }, // 2MB
  fileFilter: fileFilter(['image/jpeg', 'image/png', 'image/webp'])
});

const uploadTeacherPhoto = multer({
  storage: teacherPhotoStorage,
  limits: { fileSize: 2 * 1024 * 1024 },
  fileFilter: fileFilter(['image/jpeg', 'image/png', 'image/webp'])
});

const uploadSchoolLogo = multer({
  storage: schoolLogoStorage,
  limits: { fileSize: 1 * 1024 * 1024 },
  fileFilter: fileFilter(['image/jpeg', 'image/png', 'image/webp', 'image/svg+xml'])
});

const uploadDocument = multer({
  storage: documentStorage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: fileFilter(['image/jpeg', 'image/png', 'application/pdf'])
});

const uploadHomework = multer({
  storage: homeworkStorage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: fileFilter([
    'image/jpeg', 'image/png', 'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ])
});

// ─── Delete file from Cloudinary ───────────────────────────────────────────────
const deleteFile = async (publicId, resourceType = 'image') => {
  try {
    const result = await cloudinary.uploader.destroy(publicId, { resource_type: resourceType });
    return result;
  } catch (error) {
    console.error('Cloudinary delete error:', error);
    throw error;
  }
};

module.exports = {
  cloudinary,
  uploadStudentPhoto,
  uploadTeacherPhoto,
  uploadSchoolLogo,
  uploadDocument,
  uploadHomework,
  deleteFile
};
