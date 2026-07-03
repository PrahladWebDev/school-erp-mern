'use strict';

const { logger } = require('../utils/logger');
const { getIO, roomForRole, roomForUser } = require('../sockets');

/**
 * Create an in-app notification for a tenant school, then push it in real
 * time over Socket.io to whoever is currently online. Never throws - a
 * failure here should never break the primary action (e.g. creating a
 * homework should still succeed even if the notification fails to save).
 *
 * @param {Object} tenantDb - req.tenantDb (must contain the Notification model)
 * @param {Object} payload
 * @param {String} payload.title
 * @param {String} payload.message
 * @param {String} [payload.type='general']
 * @param {String} [payload.priority='normal']
 * @param {String[]} [payload.recipientRoles=[]] - broadcast to all users of these roles
 * @param {ObjectId[]} [payload.recipientIds=[]] - specific global User ids
 * @param {ObjectId} [payload.relatedId]
 * @param {ObjectId} [payload.createdBy]
 * @param {String} [payload.createdByName]
 * @param {String} [payload.schoolId] - req.schoolId; required for role-broadcast
 *   notifications to be pushed in real time (direct user notifications don't
 *   need it since the "user:<id>" room isn't school-scoped).
 */
async function notify(tenantDb, payload) {
  try {
    const { Notification } = tenantDb || {};
    if (!Notification) return null;

    const {
      title, message, type = 'general', priority = 'normal',
      recipientRoles = [], recipientIds = [],
      relatedId = null, createdBy = null, createdByName = null,
      schoolId = null
    } = payload || {};

    if (!title || !message) return null;

    const uniqueRecipientIds = [...new Set(
      (recipientIds || []).filter(Boolean).map(id => id.toString())
    )];

    if ((!recipientRoles || recipientRoles.length === 0) && uniqueRecipientIds.length === 0) {
      return null;
    }

    const notification = await Notification.create({
      title, message, type, priority,
      recipientRoles,
      recipientIds: uniqueRecipientIds,
      relatedId, createdBy, createdByName
    });

    pushRealtime(notification, { recipientRoles, recipientIds: uniqueRecipientIds, schoolId });

    return notification;
  } catch (err) {
    logger.error('Failed to create notification:', err);
    return null;
  }
}

/**
 * Emit the freshly-created notification to every connected socket in the
 * target rooms. Safe to call even if Socket.io hasn't initialized yet or no
 * one is connected — Socket.io just no-ops for empty rooms.
 */
function pushRealtime(notification, { recipientRoles, recipientIds, schoolId }) {
  try {
    const io = getIO();
    if (!io) return;

    const payload = { ...notification.toObject(), isRead: false };

    if (schoolId) {
      (recipientRoles || []).forEach(role => {
        io.to(roomForRole(schoolId, role)).emit('notification:new', payload);
      });
    }
    (recipientIds || []).forEach(id => {
      io.to(roomForUser(id)).emit('notification:new', payload);
    });
  } catch (err) {
    logger.error('Failed to push realtime notification:', err);
  }
}

/**
 * Resolve global User ids (students + their guardians) for all active
 * students belonging to a class.
 */
async function resolveClassRecipients(tenantDb, classId, { students = true, guardians = true } = {}) {
  try {
    if (!classId) return [];
    const { Student } = tenantDb;
    const list = await Student.find({ class: classId, status: 'active' })
      .select('userId guardians')
      .lean();
    return collectIds(list, students, guardians);
  } catch (err) {
    logger.error('Failed to resolve class recipients:', err);
    return [];
  }
}

/**
 * Resolve global User ids (students + their guardians) for a specific list
 * of tenant Student ids.
 */
async function resolveStudentRecipients(tenantDb, studentIds, { students = true, guardians = true } = {}) {
  try {
    if (!studentIds || studentIds.length === 0) return [];
    const { Student } = tenantDb;
    const list = await Student.find({ _id: { $in: studentIds } })
      .select('userId guardians')
      .lean();
    return collectIds(list, students, guardians);
  } catch (err) {
    logger.error('Failed to resolve student recipients:', err);
    return [];
  }
}

function collectIds(studentList, students, guardians) {
  const ids = [];
  studentList.forEach(s => {
    if (students && s.userId) ids.push(s.userId);
    if (guardians) {
      (s.guardians || []).forEach(g => g.userId && ids.push(g.userId));
    }
  });
  return ids;
}

module.exports = { notify, resolveClassRecipients, resolveStudentRecipients };
