'use strict';

const mongoose = require('mongoose');

const salaryRecordSchema = new mongoose.Schema({
  month: { type: String, required: true }, // e.g. "2024-01"
  basicSalary: { type: Number, required: true },
  allowances: {
    hra: { type: Number, default: 0 },
    da: { type: Number, default: 0 },
    ta: { type: Number, default: 0 },
    other: { type: Number, default: 0 }
  },
  deductions: {
    pf: { type: Number, default: 0 },
    tax: { type: Number, default: 0 },
    other: { type: Number, default: 0 }
  },
  totalSalary: { type: Number },
  netSalary: { type: Number },
  paidDate: { type: Date },
  paymentMode: {
    type: String,
    enum: ['cash', 'bank_transfer', 'cheque', 'upi'],
    default: 'bank_transfer'
  },
  status: {
    type: String,
    enum: ['pending', 'paid'],
    default: 'pending'
  },
  remarks: { type: String }
}, { _id: true });

const teacherSchema = new mongoose.Schema({
  // Auto-generated
  employeeId: {
    type: String,
    unique: true,
    trim: true
  },

  // Personal
  firstName: { type: String, required: true, trim: true },
  lastName: { type: String, trim: true },
  gender: {
    type: String,
    enum: ['male', 'female', 'other'],
    required: true
  },
  dateOfBirth: { type: Date },
  aadharNumber: { type: String, trim: true },
  religion: { type: String, trim: true },
  category: {
    type: String,
    enum: ['General', 'OBC', 'SC', 'ST', 'Other'],
    default: 'General'
  },

  // Contact
  mobile: {
    type: String,
    required: true,
    trim: true,
    match: [/^[6-9]\d{9}$/, 'Invalid mobile number']
  },
  alternateMobile: { type: String, trim: true },
  email: { type: String, lowercase: true, trim: true },
  address: {
    line1: { type: String, trim: true },
    village: { type: String, trim: true },
    district: { type: String, trim: true },
    state: { type: String, trim: true },
    pincode: { type: String, trim: true }
  },

  // Professional
  qualification: { type: String, required: true, trim: true },
  specialization: { type: String, trim: true },
  experience: { type: Number, default: 0 }, // years
  designation: {
    type: String,
    enum: ['principal', 'vice_principal', 'head_teacher', 'teacher', 'assistant_teacher', 'peon', 'other'],
    default: 'teacher'
  },
  joiningDate: { type: Date, required: true },
  leavingDate: { type: Date },
  employmentType: {
    type: String,
    enum: ['permanent', 'contract', 'part_time', 'guest'],
    default: 'permanent'
  },

  // Subjects & Classes
  subjects: [{ type: String, trim: true }],
  assignedClasses: [{
    classId: { type: mongoose.Schema.Types.ObjectId, ref: 'Class' },
    className: { type: String },
    section: { type: String },
    isClassTeacher: { type: Boolean, default: false }
  }],

  // Salary
  basicSalary: { type: Number, default: 0 },
  salaryRecords: [salaryRecordSchema],

  // Bank Details
  bankDetails: {
    bankName: { type: String, trim: true },
    accountNumber: { type: String, trim: true },
    ifscCode: { type: String, trim: true, uppercase: true },
    accountHolderName: { type: String, trim: true }
  },

  // Photo
  photo: {
    url: { type: String },
    publicId: { type: String }
  },

  // Documents
  documents: [{
    name: { type: String },
    type: { type: String },
    url: { type: String },
    publicId: { type: String }
  }],

  // Status
  status: {
    type: String,
    enum: ['active', 'inactive', 'on_leave', 'terminated', 'resigned'],
    default: 'active'
  },

  // Auth
  userId: { type: mongoose.Schema.Types.ObjectId },

  // Metadata
  createdBy: { type: mongoose.Schema.Types.ObjectId },
  updatedBy: { type: mongoose.Schema.Types.ObjectId }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

teacherSchema.virtual('fullName').get(function () {
  return `${this.firstName} ${this.lastName || ''}`.trim();
});

teacherSchema.index({ employeeId: 1 });
teacherSchema.index({ status: 1 });
teacherSchema.index({ firstName: 'text', lastName: 'text', employeeId: 'text' });

teacherSchema.pre('save', async function (next) {
  if (!this.employeeId) {
    const year = new Date().getFullYear().toString().slice(-2);
    const count = await this.constructor.countDocuments();
    this.employeeId = `EMP${year}${String(count + 1).padStart(3, '0')}`;
  }
  next();
});

module.exports = (connection) => connection.model('Teacher', teacherSchema);
