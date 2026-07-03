'use strict';

const mongoose = require('mongoose');

const auditLogSchema = new mongoose.Schema({
  // Who
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  userName: { type: String },
  userRole: { type: String },
  userEmail: { type: String },

  // Where
  schoolId: { type: mongoose.Schema.Types.ObjectId, ref: 'School' },
  schoolCode: { type: String },

  // What
  action: {
    type: String,
    enum: [
      'CREATE', 'READ', 'UPDATE', 'DELETE',
      'LOGIN', 'LOGOUT', 'LOGIN_FAILED',
      'PASSWORD_RESET', 'PASSWORD_CHANGE',
      'FILE_UPLOAD', 'FILE_DELETE',
      'EXPORT', 'PRINT', 'BULK_ACTION'
    ],
    required: true
  },
  module: {
    type: String,
    enum: [
      'auth', 'student', 'teacher', 'attendance', 'fees',
      'exam', 'homework', 'notice_board', 'parent', 'accounting',
      'class', 'timetable', 'leave', 'scholarship', 'school', 'user', 'report', 'notification'
    ]
  },
  description: { type: String },

  // Request Details
  method: { type: String, enum: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'] },
  endpoint: { type: String },
  ipAddress: { type: String },
  userAgent: { type: String },

  // Changes
  previousData: { type: mongoose.Schema.Types.Mixed },
  newData: { type: mongoose.Schema.Types.Mixed },

  // Response
  statusCode: { type: Number },
  success: { type: Boolean, default: true },
  errorMessage: { type: String },

  // Timing
  duration: { type: Number }, // ms
  timestamp: { type: Date, default: Date.now }
}, {
  timestamps: false,
  versionKey: false
});

auditLogSchema.index({ schoolId: 1, timestamp: -1 });
auditLogSchema.index({ userId: 1, timestamp: -1 });
auditLogSchema.index({ module: 1, action: 1 });
auditLogSchema.index({ timestamp: -1 });

// TTL: auto-delete logs older than 1 year
auditLogSchema.index({ timestamp: 1 }, { expireAfterSeconds: 365 * 24 * 60 * 60 });

module.exports = mongoose.model('AuditLog', auditLogSchema);
