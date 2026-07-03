'use strict';

const mongoose = require('mongoose');

// ─── HOMEWORK MODEL ────────────────────────────────────────────────────────────
const homeworkSchema = new mongoose.Schema({
  title: { type: String, required: true, trim: true },
  description: { type: String, trim: true },
  classId: { type: mongoose.Schema.Types.ObjectId, ref: 'Class', required: true },
  className: { type: String },
  section: { type: String, uppercase: true },
  subject: { type: String, required: true },
  assignedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Teacher', required: true },
  teacherName: { type: String },
  assignedDate: { type: Date, default: Date.now },
  dueDate: { type: Date, required: true },
  academicYear: { type: String, required: true },
  attachments: [{
    name: { type: String },
    url: { type: String },
    publicId: { type: String },
    fileType: { type: String }
  }],
  status: {
    type: String,
    enum: ['active', 'expired', 'cancelled'],
    default: 'active'
  },
  isEvaluated: { type: Boolean, default: false }
}, { timestamps: true });

homeworkSchema.index({ classId: 1, dueDate: -1 });
homeworkSchema.index({ assignedBy: 1, academicYear: 1 });

// Auto-expire is handled per-role in the controller

// ─── NOTICE BOARD MODEL ────────────────────────────────────────────────────────
const noticeBoardSchema = new mongoose.Schema({
  title: { type: String, required: true, trim: true },
  content: { type: String, required: true },
  category: {
    type: String,
    enum: ['general', 'holiday', 'event', 'circular', 'exam', 'fees', 'urgent', 'other'],
    default: 'general'
  },
  targetAudience: {
    type: [String],
    enum: ['all', 'students', 'teachers', 'parents', 'staff'],
    default: ['all']
  },
  targetClasses: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Class' }],
  isAllClasses: { type: Boolean, default: true },
  publishDate: { type: Date, default: Date.now },
  expiryDate: { type: Date },
  isPinned: { type: Boolean, default: false },
  isActive: { type: Boolean, default: true },
  attachments: [{
    name: { type: String },
    url: { type: String },
    publicId: { type: String }
  }],
  createdBy: { type: mongoose.Schema.Types.ObjectId },
  createdByName: { type: String }
}, { timestamps: true });

noticeBoardSchema.index({ publishDate: -1, isActive: 1 });
noticeBoardSchema.index({ category: 1 });

// ─── LEAVE REQUEST MODEL ───────────────────────────────────────────────────────
const leaveSchema = new mongoose.Schema({
  applicantType: {
    type: String,
    enum: ['student', 'teacher'],
    required: true
  },
  applicantId: { type: mongoose.Schema.Types.ObjectId, required: true },
  applicantName: { type: String },
  classId: { type: mongoose.Schema.Types.ObjectId, ref: 'Class' },
  fromDate: { type: Date, required: true },
  toDate: { type: Date, required: true },
  totalDays: { type: Number },
  leaveType: {
    type: String,
    enum: ['sick', 'casual', 'emergency', 'vacation', 'other'],
    required: true
  },
  reason: { type: String, required: true },
  parentApproval: { type: Boolean, default: false },
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected', 'cancelled'],
    default: 'pending'
  },
  approvedBy: { type: mongoose.Schema.Types.ObjectId },
  approvedByName: { type: String },
  approvedByRole: { type: String },
  approvedAt: { type: Date },
  rejectionReason: { type: String },
  attachments: [{
    name: { type: String },
    url: { type: String }
  }]
}, { timestamps: true });

leaveSchema.pre('save', function (next) {
  if (this.fromDate && this.toDate) {
    const diff = (this.toDate - this.fromDate) / (1000 * 60 * 60 * 24);
    this.totalDays = Math.ceil(diff) + 1;
  }
  next();
});

leaveSchema.index({ applicantId: 1, status: 1 });
leaveSchema.index({ fromDate: 1, toDate: 1 });

// ─── TIMETABLE MODEL ──────────────────────────────────────────────────────────
const timetableSchema = new mongoose.Schema({
  classId: { type: mongoose.Schema.Types.ObjectId, ref: 'Class', required: true },
  section: { type: String, uppercase: true },
  academicYear: { type: String, required: true },
  schedule: [{
    day: {
      type: String,
      enum: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
      required: true
    },
    periods: [{
      periodNumber: { type: Number, required: true },
      startTime: { type: String, required: true },
      endTime: { type: String, required: true },
      subject: { type: String },
      teacherId: { type: mongoose.Schema.Types.ObjectId, ref: 'Teacher' },
      teacherName: { type: String },
      isBreak: { type: Boolean, default: false },
      breakLabel: { type: String } // e.g. "Lunch Break"
    }]
  }],
  isActive: { type: Boolean, default: true },
  createdBy: { type: mongoose.Schema.Types.ObjectId }
}, { timestamps: true });

timetableSchema.index({ classId: 1, section: 1, academicYear: 1 }, { unique: true });

// ─── ACCOUNTING / EXPENSE MODEL ────────────────────────────────────────────────
const expenseSchema = new mongoose.Schema({
  title: { type: String, required: true, trim: true },
  category: {
    type: String,
    enum: [
      'salary', 'rent', 'electricity', 'water', 'maintenance',
      'stationery', 'equipment', 'sports', 'transport', 'other'
    ],
    required: true
  },
  amount: { type: Number, required: true },
  date: { type: Date, required: true, default: Date.now },
  paymentMode: {
    type: String,
    enum: ['cash', 'cheque', 'bank_transfer', 'upi'],
    default: 'cash'
  },
  paidTo: { type: String, trim: true },
  description: { type: String },
  billNumber: { type: String },
  attachments: [{ name: String, url: String }],
  academicYear: { type: String, required: true },
  month: { type: String }, // "2024-01"
  createdBy: { type: mongoose.Schema.Types.ObjectId }
}, { timestamps: true });

expenseSchema.index({ academicYear: 1, month: 1 });
expenseSchema.index({ category: 1, date: -1 });

// ─── SCHOLARSHIP MODEL ────────────────────────────────────────────────────────
const scholarshipSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  description: { type: String },
  provider: { type: String, trim: true },
  providerType: {
    type: String,
    enum: ['government', 'private', 'trust', 'ngo', 'school', 'other'],
    default: 'government'
  },
  amount: { type: Number, required: true },
  eligibility: {
    minPercentage: { type: Number },
    maxFamilyIncome: { type: Number },
    categories: [{ type: String }],
    gender: { type: String, enum: ['any', 'male', 'female'], default: 'any' }
  },
  applicationDeadline: { type: Date },
  academicYear: { type: String, required: true },
  applications: [{
    studentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Student' },
    studentName: { type: String },
    appliedDate: { type: Date, default: Date.now },
    status: {
      type: String,
      enum: ['applied', 'under_review', 'approved', 'rejected', 'received'],
      default: 'applied'
    },
    amountReceived: { type: Number, default: 0 },
    remarks: { type: String }
  }],
  isActive: { type: Boolean, default: true },
  createdBy: { type: mongoose.Schema.Types.ObjectId }
}, { timestamps: true });

module.exports = {
  HomeworkModel: (conn) => conn.model('Homework', homeworkSchema),
  NoticeBoardModel: (conn) => conn.model('NoticeBoard', noticeBoardSchema),
  LeaveModel: (conn) => conn.model('Leave', leaveSchema),
  TimetableModel: (conn) => conn.model('Timetable', timetableSchema),
  ExpenseModel: (conn) => conn.model('Expense', expenseSchema),
  ScholarshipModel: (conn) => conn.model('Scholarship', scholarshipSchema)
};
