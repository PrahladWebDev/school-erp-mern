'use strict';

const User = require('../models/global/User');
const School = require('../models/global/School');
const AppError = require('../utils/AppError');
const { logger } = require('../utils/logger');

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

const createTeacher = async (req, res, next) => {
  try {
    const { Teacher } = req.tenantDb;

    const teacher = await Teacher.create({ ...req.body, createdBy: req.user._id });

    let generatedPassword = null;
    if (req.body.email && req.body.createAccount !== false) {
      generatedPassword = `Teacher@${Math.floor(1000 + Math.random() * 9000)}`;
      const userAccount = await User.create({
        name: `${req.body.firstName} ${req.body.lastName || ''}`.trim(),
        email: req.body.email,
        mobile: req.body.mobile,
        password: generatedPassword,
        role: 'teacher',
        schoolId: req.school._id,
        schoolCode: req.school.schoolCode,
        profileId: teacher._id.toString(),
        profileType: 'Teacher',
        isActive: true
      });
      await Teacher.findByIdAndUpdate(teacher._id, { userId: userAccount._id });
    }

    // Update super-admin stats
    syncSchoolStats(req.school._id, req.tenantDb);

    res.status(201).json({
      success: true,
      message: 'Teacher added successfully',
      data: { teacher, password: generatedPassword }
    });
  } catch (err) { next(err); }
};

const getAllTeachers = async (req, res, next) => {
  try {
    const { Teacher } = req.tenantDb;
    const { status = 'active', search, designation, page = 1, limit = 20 } = req.query;
    const filter = {};
    if (status) filter.status = status;
    if (designation) filter.designation = designation;
    if (search) {
      filter.$or = [
        { firstName: { $regex: search, $options: 'i' } },
        { lastName: { $regex: search, $options: 'i' } },
        { employeeId: { $regex: search, $options: 'i' } },
        { mobile: { $regex: search, $options: 'i' } }
      ];
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const [teachers, total] = await Promise.all([
      Teacher.find(filter).sort({ firstName: 1 }).skip(skip).limit(parseInt(limit)).lean(),
      Teacher.countDocuments(filter)
    ]);

    res.json({ success: true, data: { teachers, pagination: { total, page: parseInt(page), limit: parseInt(limit), pages: Math.ceil(total / parseInt(limit)) } } });
  } catch (err) { next(err); }
};

const getTeacherById = async (req, res, next) => {
  try {
    const { Teacher } = req.tenantDb;
    const teacher = await Teacher.findById(req.params.id);
    if (!teacher) return next(new AppError('Teacher not found', 404));
    res.json({ success: true, data: { teacher } });
  } catch (err) { next(err); }
};

const updateTeacher = async (req, res, next) => {
  try {
    const { Teacher } = req.tenantDb;
    delete req.body.employeeId;
    const teacher = await Teacher.findByIdAndUpdate(
      req.params.id,
      { ...req.body, updatedBy: req.user._id },
      { new: true, runValidators: true }
    );
    if (!teacher) return next(new AppError('Teacher not found', 404));
    res.json({ success: true, message: 'Teacher updated', data: { teacher } });
  } catch (err) { next(err); }
};

const addSalaryRecord = async (req, res, next) => {
  try {
    const { Teacher } = req.tenantDb;
    const { month, basicSalary, allowances, deductions, paidDate, paymentMode, status, remarks } = req.body;

    const allowanceTotal = Object.values(allowances || {}).reduce((s, v) => s + (v || 0), 0);
    const deductionTotal = Object.values(deductions || {}).reduce((s, v) => s + (v || 0), 0);
    const totalSalary = basicSalary + allowanceTotal;
    const netSalary = totalSalary - deductionTotal;

    const teacher = await Teacher.findByIdAndUpdate(
      req.params.id,
      { $push: { salaryRecords: { month, basicSalary, allowances, deductions, totalSalary, netSalary, paidDate, paymentMode, status, remarks } } },
      { new: true }
    );

    if (!teacher) return next(new AppError('Teacher not found', 404));
    res.json({ success: true, message: 'Salary record added', data: { salaryRecords: teacher.salaryRecords } });
  } catch (err) { next(err); }
};

const getSalaryRecords = async (req, res, next) => {
  try {
    const { Teacher } = req.tenantDb;
    const { month, status } = req.query;

    const teachers = await Teacher.find({ status: 'active' })
      .select('firstName lastName employeeId designation salaryRecords basicSalary')
      .lean();

    const report = teachers.map(t => {
      let records = t.salaryRecords || [];
      if (month) records = records.filter(r => r.month === month);
      if (status) records = records.filter(r => r.status === status);
      return { teacherId: t._id, name: `${t.firstName} ${t.lastName || ''}`.trim(), employeeId: t.employeeId, designation: t.designation, basicSalary: t.basicSalary, records };
    });

    res.json({ success: true, data: { report } });
  } catch (err) { next(err); }
};

const uploadTeacherPhoto = async (req, res, next) => {
  try {
    const { Teacher } = req.tenantDb;
    if (!req.file) return next(new AppError('No file uploaded', 400));

    const teacher = await Teacher.findByIdAndUpdate(
      req.params.id,
      { 'photo.url': req.file.path, 'photo.publicId': req.file.filename },
      { new: true }
    );
    if (!teacher) return next(new AppError('Teacher not found', 404));

    res.json({ success: true, message: 'Photo uploaded', data: { photoUrl: req.file.path } });
  } catch (err) { next(err); }
};

const resetTeacherCredentials = async (req, res, next) => {
  try {
    const { Teacher } = req.tenantDb;
    const teacher = await Teacher.findById(req.params.id);
    if (!teacher) return next(new AppError('Teacher not found', 404));

    const newPassword = `Teacher@${Math.floor(1000 + Math.random() * 9000)}`;

    let userAccount = await User.findOne({ profileId: teacher._id.toString(), role: 'teacher' });
    if (userAccount) {
      userAccount.password = newPassword;
      await userAccount.save();
    } else {
      // Teacher has no account yet — create one
      if (!teacher.email) return next(new AppError('Teacher has no email address. Update the teacher profile first.', 400));
      userAccount = await User.create({
        name: `${teacher.firstName} ${teacher.lastName || ''}`.trim(),
        email: teacher.email,
        mobile: teacher.mobile,
        password: newPassword,
        role: 'teacher',
        schoolId: req.school._id,
        schoolCode: req.school.schoolCode,
        profileId: teacher._id.toString(),
        profileType: 'Teacher',
        isActive: true
      });
      await Teacher.findByIdAndUpdate(teacher._id, { userId: userAccount._id });
    }

    res.json({
      success: true,
      message: 'Teacher credentials reset',
      data: { email: userAccount.email, password: newPassword }
    });
  } catch (err) { next(err); }
};

module.exports = {
  createTeacher, getAllTeachers, getTeacherById,
  updateTeacher, addSalaryRecord, getSalaryRecords,
  uploadTeacherPhoto, resetTeacherCredentials
};
