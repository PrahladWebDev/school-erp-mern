'use strict';

const mongoose = require('mongoose');

// ─── NOTIFICATION MODEL ─────────────────────────────────────────────────────────
// Powers in-app notifications. A single notification document can target either
// one or more roles (broadcast, e.g. "all teachers") and/or a specific list of
// individual recipients (e.g. a class's students + their guardians). Read state
// is tracked per-user via `readBy` so the same document can be shared by many
// recipients without needing to fan out a row per user.
const notificationSchema = new mongoose.Schema({
  title: { type: String, required: true, trim: true },
  message: { type: String, required: true, trim: true },
  type: {
    type: String,
    enum: [
      'notice', 'homework', 'leave', 'fees', 'exam',
      'attendance', 'timetable', 'scholarship', 'general'
    ],
    default: 'general'
  },
  priority: {
    type: String,
    enum: ['low', 'normal', 'high'],
    default: 'normal'
  },

  // Broadcast targeting: any global User with one of these roles (within this
  // school) will see the notification.
  recipientRoles: {
    type: [String],
    enum: ['school_admin', 'teacher', 'parent', 'student'],
    default: []
  },

  // Direct targeting: specific global User _ids (e.g. a leave applicant, or
  // the students/guardians belonging to a particular class).
  recipientIds: [{ type: mongoose.Schema.Types.ObjectId }],

  // Global User _ids who have read this notification.
  readBy: [{ type: mongoose.Schema.Types.ObjectId }],

  // Optional reference to the entity this notification is about (homework id,
  // notice id, exam id, etc.) so the frontend can deep-link if needed.
  relatedId: { type: mongoose.Schema.Types.ObjectId },

  createdBy: { type: mongoose.Schema.Types.ObjectId },
  createdByName: { type: String },

  isActive: { type: Boolean, default: true }
}, { timestamps: true });

notificationSchema.index({ recipientRoles: 1, createdAt: -1 });
notificationSchema.index({ recipientIds: 1, createdAt: -1 });
notificationSchema.index({ isActive: 1, createdAt: -1 });

module.exports = (conn) => conn.model('Notification', notificationSchema);
