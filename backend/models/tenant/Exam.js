'use strict';

const mongoose = require('mongoose');

// ─── EXAM MODEL ────────────────────────────────────────────────────────────────
const examSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true }, // e.g. "First Unit Test"
  examType: {
    type: String,
    enum: ['unit_test', 'half_yearly', 'annual', 'pre_board', 'practical', 'oral', 'other'],
    required: true
  },
  academicYear: { type: String, required: true },
  classId: { type: mongoose.Schema.Types.ObjectId, ref: 'Class' },
  className: { type: String },
  startDate: { type: Date },
  endDate: { type: Date },
  subjects: [{
    subjectName: { type: String, required: true },
    subjectCode: { type: String },
    examDate: { type: Date },
    startTime: { type: String },
    endTime: { type: String },
    maxMarks: { type: Number, required: true },
    passMarks: { type: Number, required: true },
    duration: { type: Number } // minutes
  }],
  gradingSystem: [{
    grade: { type: String },
    minPercentage: { type: Number },
    maxPercentage: { type: Number },
    remarks: { type: String }
  }],
  isResultPublished: { type: Boolean, default: false },
  publishedAt: { type: Date },
  status: {
    type: String,
    enum: ['upcoming', 'ongoing', 'completed', 'cancelled'],
    default: 'upcoming'
  },
  createdBy: { type: mongoose.Schema.Types.ObjectId }
}, { timestamps: true });

examSchema.index({ academicYear: 1, classId: 1 });

// Default grading system
examSchema.pre('save', function (next) {
  if (!this.gradingSystem || this.gradingSystem.length === 0) {
    this.gradingSystem = [
      { grade: 'A+', minPercentage: 90, maxPercentage: 100, remarks: 'Outstanding' },
      { grade: 'A', minPercentage: 80, maxPercentage: 89, remarks: 'Excellent' },
      { grade: 'B+', minPercentage: 70, maxPercentage: 79, remarks: 'Very Good' },
      { grade: 'B', minPercentage: 60, maxPercentage: 69, remarks: 'Good' },
      { grade: 'C', minPercentage: 50, maxPercentage: 59, remarks: 'Average' },
      { grade: 'D', minPercentage: 35, maxPercentage: 49, remarks: 'Below Average' },
      { grade: 'F', minPercentage: 0, maxPercentage: 34, remarks: 'Fail' }
    ];
  }
  next();
});

// ─── RESULT / MARKS MODEL ─────────────────────────────────────────────────────
const marksSchema = new mongoose.Schema({
  subjectName: { type: String, required: true },
  subjectCode: { type: String },
  maxMarks: { type: Number, required: true },
  passMarks: { type: Number, required: true },
  marksObtained: { type: Number, default: null },
  isAbsent: { type: Boolean, default: false },
  grade: { type: String },
  remarks: { type: String }
}, { _id: true });

const resultSchema = new mongoose.Schema({
  examId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Exam',
    required: true
  },
  examName: { type: String },
  examType: { type: String },
  studentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Student',
    required: true
  },
  studentName: { type: String },
  admissionNumber: { type: String },
  classId: { type: mongoose.Schema.Types.ObjectId, ref: 'Class' },
  className: { type: String },
  section: { type: String },
  academicYear: { type: String, required: true },
  rollNumber: { type: String },

  marks: [marksSchema],

  // Calculated fields
  totalMarks: { type: Number, default: 0 },
  totalMaxMarks: { type: Number, default: 0 },
  obtainedPercentage: { type: Number, default: 0 },
  grade: { type: String },
  rank: { type: Number },
  result: {
    type: String,
    enum: ['pass', 'fail', 'absent', 'pending'],
    default: 'pending'
  },
  remarks: { type: String },
  isPublished: { type: Boolean, default: false },
  enteredBy: { type: mongoose.Schema.Types.ObjectId },
  enteredByName: { type: String },
  enteredByRole: { type: String },
  enteredAt: { type: Date }
}, { timestamps: true });

// Auto-calculate totals and grade
resultSchema.pre('save', function (next) {
  const validMarks = this.marks.filter(m => !m.isAbsent && m.marksObtained !== null);
  this.totalMarks = validMarks.reduce((s, m) => s + m.marksObtained, 0);
  this.totalMaxMarks = this.marks.reduce((s, m) => s + m.maxMarks, 0);
  this.obtainedPercentage = this.totalMaxMarks > 0
    ? parseFloat(((this.totalMarks / this.totalMaxMarks) * 100).toFixed(2))
    : 0;
  // Check pass/fail
  const failedSubjects = validMarks.filter(m => m.marksObtained < m.passMarks);
  if (this.marks.some(m => m.isAbsent)) this.result = 'absent';
  else if (failedSubjects.length > 0) this.result = 'fail';
  else if (validMarks.length === this.marks.length) this.result = 'pass';
  else this.result = 'pending';
  next();
});

resultSchema.index({ examId: 1, studentId: 1 }, { unique: true });
resultSchema.index({ classId: 1, academicYear: 1 });
resultSchema.index({ studentId: 1, academicYear: 1 });

module.exports = {
  ExamModel: (conn) => conn.model('Exam', examSchema),
  ResultModel: (conn) => conn.model('Result', resultSchema)
};
