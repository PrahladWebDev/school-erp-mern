'use strict';

const Joi = require('joi');
const AppError = require('../utils/AppError');

// ─── Generic Joi Validator ─────────────────────────────────────────────────────
const validate = (schema, property = 'body') => {
  return (req, res, next) => {
    const { error, value } = schema.validate(req[property], {
      abortEarly: false,
      stripUnknown: true,
      allowUnknown: false
    });

    if (error) {
      const errors = error.details.map(d => ({
        field: d.path.join('.'),
        message: d.message.replace(/['"]/g, '')
      }));
      return next(new AppError('Validation failed', 400, errors));
    }

    req[property] = value;
    next();
  };
};

// ─── Pagination Validator ──────────────────────────────────────────────────────
const validatePagination = (req, res, next) => {
  const page = parseInt(req.query.page) || 1;
  const limit = Math.min(parseInt(req.query.limit) || 20, 100);
  const sortBy = req.query.sortBy || 'createdAt';
  const sortOrder = req.query.sortOrder === 'asc' ? 1 : -1;

  req.pagination = { page, limit, skip: (page - 1) * limit, sortBy, sortOrder };
  next();
};

// ─── Common Schemas ────────────────────────────────────────────────────────────
const SCHEMAS = {
  // Auth
  register: Joi.object({
    name: Joi.string().min(2).max(100).required(),
    email: Joi.string().email().required(),
    mobile: Joi.string().pattern(/^[6-9]\d{9}$/).required(),
    password: Joi.string().min(8).max(128).required(),
    schoolCode: Joi.string().uppercase().optional()
  }),

  login: Joi.object({
    email: Joi.string().email().required(),
    password: Joi.string().required()
  }),

  // Student
  createStudent: Joi.object({
    firstName: Joi.string().min(2).max(50).required(),
    lastName: Joi.string().max(50).optional().allow(''),
    rollNumber: Joi.string().max(20).optional().allow(''),
    gender: Joi.string().valid('male', 'female', 'other').required(),
    dateOfBirth: Joi.date().max('now').required(),
    bloodGroup: Joi.string().valid('A+', 'A-', 'B+', 'B-', 'O+', 'O-', 'AB+', 'AB-', 'Unknown').optional(),
    aadharNumber: Joi.string().pattern(/^\d{12}$/).optional().allow(''),
    mobileNumber: Joi.string().pattern(/^[6-9]\d{9}$/).optional().allow(''),
    email: Joi.string().email().optional().allow(''),
    class: Joi.string().hex().length(24).required(),
    section: Joi.string().max(5).optional().allow(''),
    academicYear: Joi.string().pattern(/^\d{4}-\d{4}$/).required(),
    admissionDate: Joi.date().optional(),
    category: Joi.string().valid('General', 'OBC', 'SC', 'ST', 'NT', 'Other').optional(),
    guardians: Joi.array().items(Joi.object({
      relation: Joi.string().valid('father', 'mother', 'guardian').required(),
      name: Joi.string().required(),
      mobile: Joi.string().pattern(/^[6-9]\d{9}$/).optional().allow(''),
      occupation: Joi.string().optional().allow(''),
      email: Joi.string().email().optional().allow('')
    })).min(1).required(),
    address: Joi.object({
      current: Joi.object({
        line1: Joi.string().optional().allow(''),
        village: Joi.string().optional().allow(''),
        taluka: Joi.string().optional().allow(''),
        district: Joi.string().optional().allow(''),
        state: Joi.string().optional().allow(''),
        pincode: Joi.string().pattern(/^\d{6}$/).optional().allow('')
      }).optional(),
      sameAsCurrent: Joi.boolean().optional()
    }).optional(),
    emergencyContact: Joi.object({
      name: Joi.string().optional().allow(''),
      relation: Joi.string().optional().allow(''),
      mobile: Joi.string().optional().allow('')
    }).optional()
  }),

  // Fee Assignment
  assignFee: Joi.object({
    studentId: Joi.string().hex().length(24).required()
      .messages({ 'string.hex': 'Select a valid student from the list', 'string.length': 'Select a valid student from the list' }),
    feeStructureId: Joi.string().hex().length(24).required(),
    discount: Joi.number().min(0).optional(),
    discountReason: Joi.string().max(200).optional().allow(''),
    dueDate: Joi.date().optional()
  }),

  // Fee Payment
  feePayment: Joi.object({
    amount: Joi.number().positive().required(),
    paymentMode: Joi.string().valid('cash', 'cheque', 'online', 'upi', 'bank_transfer', 'dd').required(),
    transactionId: Joi.string().optional().allow(''),
    chequeNumber: Joi.string().optional().allow(''),
    bankName: Joi.string().optional().allow(''),
    remarks: Joi.string().max(500).optional().allow('')
  }),

  // Attendance
  markAttendance: Joi.object({
    classId: Joi.string().hex().length(24).required(),
    section: Joi.string().optional().allow(''),
    date: Joi.date().max('now').required(),
    academicYear: Joi.string().required(),
    records: Joi.array().items(Joi.object({
      studentId: Joi.string().hex().length(24).required(),
      status: Joi.string().valid('present', 'absent', 'late', 'leave', 'holiday').required(),
      remarks: Joi.string().optional().allow(''),
      leaveType: Joi.string().valid('sick', 'casual', 'other').optional().allow(null)
    })).min(1).required()
  }),

  // School registration
  createSchool: Joi.object({
    name: Joi.string().min(3).max(200).required(),
    type: Joi.string().valid('primary', 'secondary', 'higher_secondary', 'coaching', 'college', 'other').optional(),
    board: Joi.string().optional(),
    medium: Joi.string().optional(),
    email: Joi.string().email().required(),
    phone: Joi.string().optional().allow(''),
    address: Joi.object({
      line1: Joi.string().optional().allow(''),
      village: Joi.string().optional().allow(''),
      taluka: Joi.string().optional().allow(''),
      district: Joi.string().optional().allow(''),
      state: Joi.string().optional().allow(''),
      pincode: Joi.string().optional().allow('')
    }).optional(),
    adminName: Joi.string().required(),
    adminEmail: Joi.string().email().required(),
    adminMobile: Joi.string().pattern(/^[6-9]\d{9}$/).required(),
    adminPassword: Joi.string().min(8).required()
  })
};

module.exports = { validate, validatePagination, SCHEMAS };
