'use strict';

const AppError = require('../utils/AppError');
const { notify } = require('../services/notificationService');
const { getIO, roomForUser } = require('../sockets');

// ══════════════════════════════════════════════════════════════════════════════
// NOTIFICATION CONTROLLER
// ══════════════════════════════════════════════════════════════════════════════
// Every tenant user (school_admin, teacher, parent, student) sees notifications
// that either broadcast to their role or directly target their User id.
// Read state is tracked per-user via the `readBy` array on each document.

const buildVisibilityFilter = (req) => ({
  isActive: true,
  $or: [
    { recipientRoles: req.user.role },
    { recipientIds: req.user._id }
  ]
});

// Lets a user's other open tabs/devices stay in sync when they mark
// something read from one of them.
const pushReadSync = (userId, event, data) => {
  try {
    const io = getIO();
    if (io) io.to(roomForUser(userId.toString())).emit(event, data);
  } catch { /* never let a socket hiccup break the request */ }
};

const notificationController = {
  // GET /api/notifications
  getAll: async (req, res, next) => {
    try {
      const { Notification } = req.tenantDb;
      const { page = 1, limit = 20, unreadOnly, type } = req.query;
      const userId = req.user._id;

      const filter = buildVisibilityFilter(req);
      if (unreadOnly === 'true') filter.readBy = { $ne: userId };
      if (type) filter.type = type;

      const skip = (parseInt(page) - 1) * parseInt(limit);
      const [notifications, total, unreadCount] = await Promise.all([
        Notification.find(filter).sort({ createdAt: -1 }).skip(skip).limit(parseInt(limit)).lean(),
        Notification.countDocuments(filter),
        Notification.countDocuments({ ...buildVisibilityFilter(req), readBy: { $ne: userId } })
      ]);

      const data = notifications.map(n => {
        const { readBy, ...rest } = n;
        return { ...rest, isRead: (readBy || []).some(id => id.toString() === userId.toString()) };
      });

      res.json({
        success: true,
        data: {
          notifications: data,
          unreadCount,
          pagination: { total, page: parseInt(page), limit: parseInt(limit), pages: Math.ceil(total / parseInt(limit)) }
        }
      });
    } catch (err) { next(err); }
  },

  // GET /api/notifications/unread-count
  getUnreadCount: async (req, res, next) => {
    try {
      const { Notification } = req.tenantDb;
      const count = await Notification.countDocuments({
        ...buildVisibilityFilter(req),
        readBy: { $ne: req.user._id }
      });
      res.json({ success: true, data: { count } });
    } catch (err) { next(err); }
  },

  // PATCH /api/notifications/:id/read
  markRead: async (req, res, next) => {
    try {
      const { Notification } = req.tenantDb;
      const notification = await Notification.findOneAndUpdate(
        { _id: req.params.id, ...buildVisibilityFilter(req) },
        { $addToSet: { readBy: req.user._id } },
        { new: true }
      );
      if (!notification) return next(new AppError('Notification not found', 404));
      pushReadSync(req.user._id, 'notification:read', { id: req.params.id });
      res.json({ success: true, message: 'Marked as read', data: { notification } });
    } catch (err) { next(err); }
  },

  // PATCH /api/notifications/mark-all-read
  markAllRead: async (req, res, next) => {
    try {
      const { Notification } = req.tenantDb;
      await Notification.updateMany(
        { ...buildVisibilityFilter(req), readBy: { $ne: req.user._id } },
        { $addToSet: { readBy: req.user._id } }
      );
      pushReadSync(req.user._id, 'notification:all-read', {});
      res.json({ success: true, message: 'All notifications marked as read' });
    } catch (err) { next(err); }
  },

  // POST /api/notifications — manual broadcast/compose (admin & teachers)
  create: async (req, res, next) => {
    try {
      const { Student } = req.tenantDb;
      const { title, message, type, priority, recipientRoles = [], targetClass } = req.body;

      if (!title || !message) return next(new AppError('Title and message are required', 400));

      let recipientIds = [];
      if (targetClass) {
        const students = await Student.find({ class: targetClass, status: 'active' })
          .select('userId guardians')
          .lean();
        students.forEach(s => {
          if (s.userId) recipientIds.push(s.userId);
          (s.guardians || []).forEach(g => g.userId && recipientIds.push(g.userId));
        });
      }

      if ((!recipientRoles || recipientRoles.length === 0) && recipientIds.length === 0) {
        return next(new AppError('Select at least one recipient role or a class', 400));
      }

      const notification = await notify(req.tenantDb, {
        title, message,
        type: type || 'general',
        priority: priority || 'normal',
        recipientRoles,
        recipientIds,
        createdBy: req.user._id,
        createdByName: req.user.name,
        schoolId: req.schoolId
      });

      if (!notification) return next(new AppError('Failed to send notification', 500));

      res.status(201).json({ success: true, message: 'Notification sent', data: { notification } });
    } catch (err) { next(err); }
  },

  // DELETE /api/notifications/:id
  delete: async (req, res, next) => {
    try {
      const { Notification } = req.tenantDb;
      const notification = await Notification.findByIdAndUpdate(req.params.id, { isActive: false });
      if (!notification) return next(new AppError('Notification not found', 404));
      res.json({ success: true, message: 'Notification deleted' });
    } catch (err) { next(err); }
  }
};

module.exports = notificationController;
