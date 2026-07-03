'use strict';

const jwt = require('jsonwebtoken');
const User = require('../models/global/User');
const AppError = require('../utils/AppError');

// ─── Protect: Verify JWT ───────────────────────────────────────────────────────
const protect = async (req, res, next) => {
  try {
    let token;
    const authHeader = req.headers.authorization;

    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.split(' ')[1];
    } else if (req.cookies && req.cookies.token) {
      token = req.cookies.token;
    }

    if (!token) {
      return next(new AppError('You are not logged in. Please log in to get access.', 401));
    }

    // Verify token
    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch (err) {
      if (err.name === 'TokenExpiredError') {
        return next(new AppError('Your session has expired. Please log in again.', 401));
      }
      return next(new AppError('Invalid token. Please log in again.', 401));
    }

    // Check if user still exists
    const currentUser = await User.findById(decoded.id).lean();
    if (!currentUser) {
      return next(new AppError('The user belonging to this token no longer exists.', 401));
    }

    // Check if account is active
    if (!currentUser.isActive) {
      return next(new AppError('Your account has been deactivated. Please contact admin.', 401));
    }

    req.user = currentUser;
    next();
  } catch (err) {
    next(err);
  }
};

// ─── Restrict To: Role-Based Access Control ────────────────────────────────────
const restrictTo = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return next(new AppError('You do not have permission to perform this action.', 403));
    }
    next();
  };
};

// ─── School Boundary Check ─────────────────────────────────────────────────────
// Ensures non-super-admins can only access their own school's data
const schoolBoundary = (req, res, next) => {
  if (req.user.role === 'super_admin') return next();

  const userSchoolId = req.user.schoolId?.toString();
  const requestSchoolId = req.schoolId?.toString() || req.headers['x-school-id'];

  if (!userSchoolId || userSchoolId !== requestSchoolId) {
    return next(new AppError('Access denied. You can only access your school\'s data.', 403));
  }
  next();
};

// ─── Optional Auth ─────────────────────────────────────────────────────────────
// Attach user if token present, but don't error if not
const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.split(' ')[1];
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await User.findById(decoded.id).lean();
      if (user && user.isActive) req.user = user;
    }
  } catch (err) {
    // Silently ignore errors
  }
  next();
};

// ─── Permission map per role ───────────────────────────────────────────────────
const PERMISSIONS = {
  super_admin: ['*'],
  school_admin: [
    'student:*', 'teacher:*', 'attendance:*', 'fees:*',
    'exam:*', 'homework:*', 'notice_board:*', 'accounting:*',
    'class:*', 'timetable:*', 'leave:*', 'scholarship:*', 'report:*'
  ],
  teacher: [
    'student:read', 'attendance:write', 'attendance:read',
    'homework:write', 'homework:read', 'exam:read', 'exam:write',
    'notice_board:read', 'leave:read', 'leave:write', 'timetable:read',
    'fees:read'
  ],
  parent: [
    'student:read_own', 'attendance:read_own', 'fees:read_own',
    'homework:read', 'exam:read_own', 'notice_board:read',
    'leave:write_own', 'leave:read_own', 'timetable:read'
  ],
  student: [
    'attendance:read_own', 'fees:read_own', 'homework:read',
    'exam:read_own', 'notice_board:read', 'timetable:read',
    'leave:write_own', 'leave:read_own'
  ]
};

const hasPermission = (role, permission) => {
  const perms = PERMISSIONS[role] || [];
  if (perms.includes('*')) return true;
  if (perms.includes(permission)) return true;
  // Check wildcard module permission e.g. 'student:*'
  const [module] = permission.split(':');
  return perms.includes(`${module}:*`);
};

const checkPermission = (permission) => {
  return (req, res, next) => {
    if (!hasPermission(req.user.role, permission)) {
      return next(new AppError('You do not have permission for this action.', 403));
    }
    next();
  };
};

module.exports = {
  protect,
  restrictTo,
  schoolBoundary,
  optionalAuth,
  checkPermission,
  hasPermission,
  PERMISSIONS
};
