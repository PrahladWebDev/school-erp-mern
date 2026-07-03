'use strict';

const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');
const User = require('../models/global/User');
const { logger } = require('../utils/logger');

let io = null;

// ─── Room naming helpers ────────────────────────────────────────────────────────
// Role broadcasts are scoped per-school so a "teacher" room in one school never
// leaks into another. Direct (user-targeted) notifications use a global room
// since a User _id is unique across the whole platform.
const roomForRole = (schoolId, role) => `school:${schoolId}:role:${role}`;
const roomForUser = (userId) => `user:${userId}`;

/**
 * Attach Socket.io to an existing HTTP server and wire up JWT-based auth +
 * room joining. Call once from server.js after the HTTP server is created.
 */
function initSocket(httpServer) {
  io = new Server(httpServer, {
    cors: {
      origin: process.env.CLIENT_URL || '*',
      credentials: true
    }
  });

  // ─── Handshake auth ─────────────────────────────────────────────────────────
  // Mirrors middleware/authMiddleware.js's `protect` + `schoolBoundary`, but for
  // the socket handshake instead of an HTTP request.
  io.use(async (socket, next) => {
    try {
      const { token, schoolId } = socket.handshake.auth || {};
      if (!token) return next(new Error('Authentication required'));

      let decoded;
      try {
        decoded = jwt.verify(token, process.env.JWT_SECRET);
      } catch {
        return next(new Error('Invalid or expired token'));
      }

      const user = await User.findById(decoded.id).lean();
      if (!user || !user.isActive) return next(new Error('Account not found or inactive'));

      // Notifications are tenant-scoped; super_admin has no school context
      // and doesn't currently use this socket layer.
      if (user.role !== 'super_admin') {
        const userSchoolId = user.schoolId?.toString();
        if (!userSchoolId || userSchoolId !== schoolId) {
          return next(new Error('School context mismatch'));
        }
        socket.schoolId = userSchoolId;
      }

      socket.user = user;
      next();
    } catch (err) {
      next(new Error('Authentication failed'));
    }
  });

  // ─── Connection handling ────────────────────────────────────────────────────
  io.on('connection', (socket) => {
    const { user, schoolId } = socket;
    if (schoolId) socket.join(roomForRole(schoolId, user.role));
    socket.join(roomForUser(user._id.toString()));

    socket.on('disconnect', () => {
      // No-op for now — rooms are cleaned up automatically by Socket.io.
    });
  });

  io.engine.on('connection_error', (err) => {
    logger.error('Socket connection error:', err.message);
  });

  logger.info('🔌 Socket.io initialized');
  return io;
}

function getIO() {
  return io;
}

module.exports = { initSocket, getIO, roomForRole, roomForUser };
