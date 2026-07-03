'use strict';

const AuditLog = require('../models/global/AuditLog');
const { auditLogger } = require('../utils/logger');

const METHOD_ACTION_MAP = {
  POST: 'CREATE',
  GET: 'READ',
  PUT: 'UPDATE',
  PATCH: 'UPDATE',
  DELETE: 'DELETE'
};

const getModuleFromPath = (path) => {
  const segments = path.split('/').filter(Boolean);
  const moduleMap = {
    'students': 'student', 'teachers': 'teacher', 'attendance': 'attendance',
    'fees': 'fees', 'exams': 'exam', 'homework': 'homework',
    'notice-board': 'notice_board', 'parents': 'parent', 'accounting': 'accounting',
    'classes': 'class', 'timetable': 'timetable', 'leaves': 'leave',
    'scholarships': 'scholarship', 'reports': 'report', 'auth': 'auth',
    'schools': 'school', 'super-admin': 'user', 'notifications': 'notification'
  };
  return moduleMap[segments[1]] || segments[1] || 'unknown';
};

const auditMiddleware = (req, res, next) => {
  if (req.method === 'GET') return next(); // Skip GET reads for performance

  const startTime = Date.now();
  const originalSend = res.json.bind(res);

  res.json = function (body) {
    const duration = Date.now() - startTime;
    const action = METHOD_ACTION_MAP[req.method] || 'UPDATE';
    const module = getModuleFromPath(req.originalUrl);

    const logEntry = {
      userId: req.user?._id,
      userName: req.user?.name,
      userRole: req.user?.role,
      userEmail: req.user?.email,
      schoolId: req.schoolId || req.user?.schoolId,
      schoolCode: req.school?.schoolCode || req.user?.schoolCode,
      action,
      module,
      description: `${req.method} ${req.originalUrl}`,
      method: req.method,
      endpoint: req.originalUrl,
      ipAddress: req.ip || req.connection?.remoteAddress,
      userAgent: req.headers['user-agent'],
      statusCode: res.statusCode,
      success: res.statusCode < 400,
      errorMessage: body?.message && res.statusCode >= 400 ? body.message : undefined,
      duration
    };

    // Save to DB async (don't block response)
    AuditLog.create(logEntry).catch(err =>
      auditLogger.error('Audit log save failed:', err)
    );

    return originalSend(body);
  };

  next();
};

module.exports = auditMiddleware;
