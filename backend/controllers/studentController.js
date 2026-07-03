'use strict';

const AppError = require('../utils/AppError');
const School = require('../models/global/School');
const User = require('../models/global/User');
const { logger } = require('../utils/logger');

// Helper: update cached stats on the School document
const syncSchoolStats = async (schoolId, tenantDb) => {
  try {
    const { Student, Teacher } = tenantDb;
    const [totalStudents, totalTeachers] = await Promise.all([
      Student.countDocuments({ status: 'active' }),
      Teacher.countDocuments({ status: 'active' }),
    ]);
    await School.findByIdAndUpdate(schoolId, {
      'stats.totalStudents': totalStudents,
      'stats.totalTeachers': totalTeachers,
      'stats.lastUpdated': new Date(),
    });
  } catch (e) {
    logger.warn('syncSchoolStats failed: ' + e.message);
  }
};

// Helper: generate a password like Student@1234
const genPassword = (prefix) =>
  `${prefix}@${Math.floor(1000 + Math.random() * 9000)}`;

// ─── @POST /api/students ──────────────────────────────────────────────────────
const createStudent = async (req, res, next) => {
  try {
    const { Student, Class } = req.tenantDb;

    const classDoc = await Class.findById(req.body.class);
    if (!classDoc) return next(new AppError('Class not found', 404));

    const student = await Student.create({
      ...req.body,
      createdBy: req.user._id
    });

    await student.populate('class', 'name sections');

    const createdAccounts = [];

    // ── Create student login account ────────────────────────────────────────
    const studentEmail = req.body.email ||
      `${req.body.admissionNumber || student.admissionNumber}@${req.school.schoolCode.toLowerCase()}.school`.toLowerCase();
    const studentPassword = genPassword('Student');

    try {
      const studentUser = await User.create({
        name: `${req.body.firstName} ${req.body.lastName || ''}`.trim(),
        email: studentEmail,
        mobile: req.body.mobile || req.body.mobileNumber,
        password: studentPassword,
        role: 'student',
        schoolId: req.school._id,
        schoolCode: req.school.schoolCode,
        profileId: student._id.toString(),
        profileType: 'Student',
        isActive: true
      });
      await Student.findByIdAndUpdate(student._id, { userId: studentUser._id });
      createdAccounts.push({ role: 'student', email: studentEmail, password: studentPassword });
    } catch (e) {
      logger.warn(`Student user account creation failed: ${e.message}`);
    }

    // ── Create parent login account for each guardian with a mobile/email ───
    const guardians = req.body.guardians || [];
    for (const guardian of guardians) {
      if (!guardian.mobile && !guardian.email) continue;
      const parentEmail = guardian.email ||
        `parent.${guardian.mobile}@${req.school.schoolCode.toLowerCase()}.school`.toLowerCase();
      const parentPassword = genPassword('Parent');
      try {
        // Check if parent account already exists (re-used across siblings)
        const existing = await User.findOne({ email: parentEmail });
        if (!existing) {
          await User.create({
            name: guardian.name || 'Parent',
            email: parentEmail,
            mobile: guardian.mobile,
            password: parentPassword,
            role: 'parent',
            schoolId: req.school._id,
            schoolCode: req.school.schoolCode,
            profileId: student._id.toString(),
            profileType: 'Parent',
            isActive: true
          });
          createdAccounts.push({ role: 'parent', name: guardian.name, relation: guardian.relation, email: parentEmail, password: parentPassword });
        }
      } catch (e) {
        logger.warn(`Parent user account creation failed: ${e.message}`);
      }
    }

    // Update super-admin stats
    syncSchoolStats(req.school._id, req.tenantDb);

    res.status(201).json({
      success: true,
      message: 'Student admitted successfully',
      data: { student, loginCredentials: createdAccounts }
    });
  } catch (err) {
    next(err);
  }
};

// ─── @GET /api/students ───────────────────────────────────────────────────────
const getAllStudents = async (req, res, next) => {
  try {
    const { Student } = req.tenantDb;
    const {
      page = 1, limit = 20, search, classId, section,
      academicYear, status = 'active', gender, category,
      sortBy = 'firstName', sortOrder = 'asc', bloodGroup
    } = req.query;

    const filter = {};
    if (status) filter.status = status;
    if (classId) filter.class = classId;
    if (section) filter.section = section.toUpperCase();
    if (academicYear) filter.academicYear = academicYear;
    if (gender) filter.gender = gender;
    if (category) filter.category = category;
    if (bloodGroup) filter.bloodGroup = bloodGroup;

    if (search) {
      filter.$or = [
        { firstName: { $regex: search, $options: 'i' } },
        { lastName: { $regex: search, $options: 'i' } },
        { admissionNumber: { $regex: search, $options: 'i' } },
        { 'guardians.mobile': { $regex: search, $options: 'i' } },
        { aadharNumber: { $regex: search, $options: 'i' } }
      ];
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const sort = { [sortBy]: sortOrder === 'asc' ? 1 : -1 };

    const [students, total] = await Promise.all([
      Student.find(filter)
        .populate('class', 'name numericName')
        .sort(sort)
        .skip(skip)
        .limit(parseInt(limit))
        .lean(),
      Student.countDocuments(filter)
    ]);

    res.json({
      success: true,
      data: {
        students,
        pagination: {
          total,
          page: parseInt(page),
          limit: parseInt(limit),
          pages: Math.ceil(total / parseInt(limit))
        }
      }
    });
  } catch (err) {
    next(err);
  }
};

// ─── @GET /api/students/:id ───────────────────────────────────────────────────
const getStudentById = async (req, res, next) => {
  try {
    const { Student } = req.tenantDb;
    const student = await Student.findById(req.params.id).populate('class', 'name sections numericName');
    if (!student) return next(new AppError('Student not found', 404));
    res.json({ success: true, data: { student } });
  } catch (err) {
    next(err);
  }
};

// ─── @PUT /api/students/:id ───────────────────────────────────────────────────
const updateStudent = async (req, res, next) => {
  try {
    const { Student } = req.tenantDb;
    delete req.body.admissionNumber;
    const student = await Student.findByIdAndUpdate(
      req.params.id,
      { ...req.body, updatedBy: req.user._id },
      { new: true, runValidators: true }
    ).populate('class', 'name sections');
    if (!student) return next(new AppError('Student not found', 404));
    res.json({ success: true, message: 'Student updated', data: { student } });
  } catch (err) {
    next(err);
  }
};

// ─── @DELETE /api/students/:id ────────────────────────────────────────────────
const deleteStudent = async (req, res, next) => {
  try {
    const { Student } = req.tenantDb;
    const student = await Student.findByIdAndUpdate(
      req.params.id,
      { status: 'left', updatedBy: req.user._id },
      { new: true }
    );
    if (!student) return next(new AppError('Student not found', 404));

    // Sync stats after status change
    syncSchoolStats(req.school._id, req.tenantDb);

    res.json({ success: true, message: 'Student removed' });
  } catch (err) {
    next(err);
  }
};

// ─── @POST /api/students/:id/promote ─────────────────────────────────────────
const promoteStudent = async (req, res, next) => {
  try {
    const { Student, Class } = req.tenantDb;
    const { newClassId, newSection, newAcademicYear } = req.body;

    const newClass = await Class.findById(newClassId);
    if (!newClass) return next(new AppError('Target class not found', 404));

    const student = await Student.findById(req.params.id).populate('class', 'name');
    if (!student) return next(new AppError('Student not found', 404));

    // Record history before updating
    const historyEntry = {
      fromClass: student.class?._id,
      fromClassName: student.class?.name,
      fromSection: student.section,
      fromAcademicYear: student.academicYear,
      toClass: newClassId,
      toClassName: newClass.name,
      toSection: newSection,
      toAcademicYear: newAcademicYear,
      promotedAt: new Date(),
      promotedBy: req.user._id
    };

    const updated = await Student.findByIdAndUpdate(
      req.params.id,
      {
        class: newClassId,
        section: newSection,
        academicYear: newAcademicYear,
        $push: { promotionHistory: historyEntry }
      },
      { new: true }
    ).populate('class', 'name');

    res.json({ success: true, message: 'Student promoted', data: { student: updated } });
  } catch (err) {
    next(err);
  }
};

// ─── @POST /api/students/bulk-promote ────────────────────────────────────────
const bulkPromote = async (req, res, next) => {
  try {
    const { Student, Class } = req.tenantDb;
    const { studentIds, newClassId, newSection, newAcademicYear } = req.body;

    if (!studentIds || !studentIds.length) return next(new AppError('No student IDs provided', 400));
    if (!newClassId) return next(new AppError('Target class is required', 400));
    if (!newAcademicYear) return next(new AppError('New academic year is required', 400));

    const newClass = await Class.findById(newClassId);
    if (!newClass) return next(new AppError('Target class not found', 404));

    // Fetch all students to record individual history
    const students = await Student.find({ _id: { $in: studentIds } }).populate('class', 'name');

    // Build bulk write ops
    const bulkOps = students.map(s => ({
      updateOne: {
        filter: { _id: s._id },
        update: {
          $set: { class: newClassId, section: newSection, academicYear: newAcademicYear },
          $push: {
            promotionHistory: {
              fromClass: s.class?._id,
              fromClassName: s.class?.name,
              fromSection: s.section,
              fromAcademicYear: s.academicYear,
              toClass: newClassId,
              toClassName: newClass.name,
              toSection: newSection,
              toAcademicYear: newAcademicYear,
              promotedAt: new Date(),
              promotedBy: req.user._id
            }
          }
        }
      }
    }));

    await Student.bulkWrite(bulkOps);

    res.json({
      success: true,
      message: `${studentIds.length} students promoted to ${newClass.name} for ${newAcademicYear}`,
      data: { promoted: studentIds.length, toClass: newClass.name, newAcademicYear }
    });
  } catch (err) {
    next(err);
  }
};

// ─── @POST /api/students/:id/transfer ────────────────────────────────────────
const transferStudent = async (req, res, next) => {
  try {
    const { Student } = req.tenantDb;
    const student = await Student.findByIdAndUpdate(
      req.params.id,
      { status: 'transferred', ...req.body },
      { new: true }
    );
    if (!student) return next(new AppError('Student not found', 404));

    syncSchoolStats(req.school._id, req.tenantDb);

    res.json({ success: true, message: 'Student transferred', data: { student } });
  } catch (err) {
    next(err);
  }
};

// ─── @POST /api/students/:id/upload-photo ────────────────────────────────────
const uploadPhoto = async (req, res, next) => {
  try {
    const { Student } = req.tenantDb;
    if (!req.file) return next(new AppError('No file uploaded', 400));

    const student = await Student.findByIdAndUpdate(
      req.params.id,
      { 'photo.url': req.file.path, 'photo.publicId': req.file.filename },
      { new: true }
    );
    if (!student) return next(new AppError('Student not found', 404));

    res.json({ success: true, message: 'Photo uploaded', data: { photoUrl: req.file.path } });
  } catch (err) {
    next(err);
  }
};

// ─── @POST /api/students/:id/documents ───────────────────────────────────────
const uploadDocument = async (req, res, next) => {
  try {
    const { Student } = req.tenantDb;
    if (!req.file) return next(new AppError('No file uploaded', 400));

    const { docType, description } = req.body;
    const student = await Student.findByIdAndUpdate(
      req.params.id,
      {
        $push: {
          documents: {
            docType, description,
            url: req.file.path,
            publicId: req.file.filename,
            uploadedAt: new Date()
          }
        }
      },
      { new: true }
    );
    if (!student) return next(new AppError('Student not found', 404));

    res.json({ success: true, message: 'Document uploaded', data: { documents: student.documents } });
  } catch (err) {
    next(err);
  }
};

// ─── @GET /api/students/stats ─────────────────────────────────────────────────
const getStudentStats = async (req, res, next) => {
  try {
    const { Student } = req.tenantDb;
    const { academicYear } = req.query;
    const filter = academicYear ? { academicYear } : {};

    const [total, active, genderDist, classDist, categoryDist] = await Promise.all([
      Student.countDocuments(filter),
      Student.countDocuments({ ...filter, status: 'active' }),
      Student.aggregate([
        { $match: filter },
        { $group: { _id: '$gender', count: { $sum: 1 } } }
      ]),
      Student.aggregate([
        { $match: { ...filter, status: 'active' } },
        { $lookup: { from: 'classes', localField: 'class', foreignField: '_id', as: 'classInfo' } },
        { $unwind: '$classInfo' },
        { $group: { _id: '$classInfo.name', count: { $sum: 1 } } },
        { $sort: { '_id': 1 } }
      ]),
      Student.aggregate([
        { $match: filter },
        { $group: { _id: '$category', count: { $sum: 1 } } }
      ])
    ]);

    res.json({
      success: true,
      data: { total, active, inactive: total - active, genderDist, classDist, categoryDist }
    });
  } catch (err) {
    next(err);
  }
};

// ─── @POST /api/students/:id/reset-credentials ───────────────────────────────
const resetStudentCredentials = async (req, res, next) => {
  try {
    const { Student } = req.tenantDb;
    const student = await Student.findById(req.params.id);
    if (!student) return next(new AppError('Student not found', 404));

    const newPassword = genPassword('Student');

    // Update existing user or create if missing
    let userAccount = await User.findOne({ profileId: student._id.toString(), role: 'student' });
    if (userAccount) {
      userAccount.password = newPassword;
      await userAccount.save();
    } else {
      const email = student.email ||
        `${student.admissionNumber}@${req.school.schoolCode.toLowerCase()}.school`.toLowerCase();
      userAccount = await User.create({
        name: `${student.firstName} ${student.lastName || ''}`.trim(),
        email,
        mobile: student.mobile || student.mobileNumber,
        password: newPassword,
        role: 'student',
        schoolId: req.school._id,
        schoolCode: req.school.schoolCode,
        profileId: student._id.toString(),
        profileType: 'Student',
        isActive: true
      });
      await Student.findByIdAndUpdate(student._id, { userId: userAccount._id });
    }

    res.json({
      success: true,
      message: 'Credentials reset successfully',
      data: {
        email: userAccount.email,
        password: newPassword,
        note: 'Share these credentials with the student. Password will need to be changed on first login.'
      }
    });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  createStudent, getAllStudents, getStudentById, updateStudent,
  deleteStudent, promoteStudent, bulkPromote, transferStudent,
  uploadPhoto, uploadDocument, getStudentStats, resetStudentCredentials
};
