'use strict';

const mongoose = require('mongoose');

// ─── CLASS MODEL ───────────────────────────────────────────────────────────────
const classSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true }, // e.g. "Class 5"
  numericName: { type: Number }, // e.g. 5
  sections: [{ type: String, uppercase: true, trim: true }], // ['A', 'B']
  academicYear: { type: String, required: true },
  classTeacher: { type: mongoose.Schema.Types.ObjectId, ref: 'Teacher' },
  subjects: [{
    name: { type: String, required: true },
    code: { type: String },
    teacherId: { type: mongoose.Schema.Types.ObjectId, ref: 'Teacher' },
    maxMarks: { type: Number, default: 100 },
    passMarks: { type: Number, default: 35 },
    isOptional: { type: Boolean, default: false }
  }],
  capacity: { type: Number, default: 50 },
  order: { type: Number, default: 0 }, // for sorting
  isActive: { type: Boolean, default: true }
}, { timestamps: true });

classSchema.index({ name: 1, academicYear: 1 }, { unique: true });

// ─── ATTENDANCE MODEL ──────────────────────────────────────────────────────────
const attendanceRecordSchema = new mongoose.Schema({
  studentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Student',
    required: true
  },
  status: {
    type: String,
    enum: ['present', 'absent', 'late', 'leave', 'holiday'],
    required: true
  },
  remarks: { type: String, trim: true },
  leaveType: {
    type: String,
    enum: ['sick', 'casual', 'other'],
    default: null
  }
}, { _id: true });

const attendanceSchema = new mongoose.Schema({
  classId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Class',
    required: true
  },
  section: { type: String, trim: true, uppercase: true },
  date: { type: Date, required: true },
  academicYear: { type: String, required: true },
  attendanceType: {
    type: String,
    enum: ['student', 'teacher'],
    default: 'student'
  },
  records: [attendanceRecordSchema],
  markedBy: { type: mongoose.Schema.Types.ObjectId },
  markedByName: { type: String },
  markedByRole: { type: String },
  markedAt: { type: Date, default: Date.now },
  isHoliday: { type: Boolean, default: false },
  holidayName: { type: String }
}, { timestamps: true });

attendanceSchema.index({ classId: 1, date: 1, section: 1 }, { unique: true });
attendanceSchema.index({ date: 1 });
attendanceSchema.index({ academicYear: 1 });

// ─── TEACHER ATTENDANCE MODEL ──────────────────────────────────────────────────
const teacherAttendanceSchema = new mongoose.Schema({
  teacherId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Teacher',
    required: true
  },
  date: { type: Date, required: true },
  status: {
    type: String,
    enum: ['present', 'absent', 'late', 'leave', 'half_day'],
    required: true
  },
  checkIn: { type: String },
  checkOut: { type: String },
  leaveType: { type: String },
  remarks: { type: String },
  markedBy: { type: mongoose.Schema.Types.ObjectId }
}, { timestamps: true });

teacherAttendanceSchema.index({ teacherId: 1, date: 1 }, { unique: true });

module.exports = {
  ClassModel: (conn) => conn.model('Class', classSchema),
  AttendanceModel: (conn) => conn.model('Attendance', attendanceSchema),
  TeacherAttendanceModel: (conn) => conn.model('TeacherAttendance', teacherAttendanceSchema)
};
