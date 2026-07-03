'use strict';

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const morgan = require('morgan');
const mongoSanitize = require('express-mongo-sanitize');
const rateLimit = require('express-rate-limit');
const path = require('path');
const http = require('http');

require('dotenv').config();

const { connectGlobalDB } = require('./config/database');
const { logger } = require('./utils/logger');
const errorHandler = require('./middleware/errorHandler');
const tenantMiddleware = require('./middleware/tenantMiddleware');
const auditMiddleware = require('./middleware/auditMiddleware');
const { initSocket } = require('./sockets');

// Route Imports
const authRoutes = require('./routes/authRoutes');
const schoolRoutes = require('./routes/schoolRoutes');
const superAdminRoutes = require('./routes/superAdminRoutes');
const studentRoutes = require('./routes/studentRoutes');
const teacherRoutes = require('./routes/teacherRoutes');
const attendanceRoutes = require('./routes/attendanceRoutes');
const feesRoutes = require('./routes/feesRoutes');
const examRoutes = require('./routes/examRoutes');
const homeworkRoutes = require('./routes/homeworkRoutes');
const noticeBoardRoutes = require('./routes/noticeBoardRoutes');
const parentRoutes = require('./routes/parentRoutes');
const accountingRoutes = require('./routes/accountingRoutes');
const classRoutes = require('./routes/classRoutes');
const timetableRoutes = require('./routes/timetableRoutes');
const leaveRoutes = require('./routes/leaveRoutes');
const dashboardRoutes = require('./routes/dashboardRoutes');
const scholarshipRoutes = require('./routes/scholarshipRoutes');
const reportRoutes = require('./routes/reportRoutes');
const uploadRoutes = require('./routes/uploadRoutes');
const notificationRoutes = require('./routes/notificationRoutes');

const app = express();

// ─── Security Middleware ───────────────────────────────────────────────────────
app.use(helmet({
  crossOriginEmbedderPolicy: false,
  contentSecurityPolicy: false
}));

app.use(cors({
  origin: process.env.CLIENT_URL || '*',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-school-id', 'x-tenant-id']
}));

// Rate Limiting
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000,
  max: parseInt(process.env.RATE_LIMIT_MAX) || 100,
  message: { success: false, message: 'Too many requests, please try again later.' },
  standardHeaders: true,
  legacyHeaders: false
});

app.use('/api/', limiter);

// ─── Body Parsing ──────────────────────────────────────────────────────────────
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(mongoSanitize());
app.use(compression());

// ─── Logging ───────────────────────────────────────────────────────────────────
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
} else {
  app.use(morgan('combined', { stream: { write: msg => logger.info(msg.trim()) } }));
}

// ─── Static Files ──────────────────────────────────────────────────────────────
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// ─── Health Check ──────────────────────────────────────────────────────────────
app.get('/health', (req, res) => {
  res.json({
    success: true,
    status: 'OK',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV,
    version: '1.0.0'
  });
});

// ─── API Routes ────────────────────────────────────────────────────────────────
// Global Routes (no tenant required)
app.use('/api/auth', authRoutes);
app.use('/api/super-admin', superAdminRoutes);
app.use('/api/schools', schoolRoutes);

// Tenant Routes (school-specific, require x-school-id header or subdomain)
app.use('/api/students', tenantMiddleware, auditMiddleware, studentRoutes);
app.use('/api/teachers', tenantMiddleware, auditMiddleware, teacherRoutes);
app.use('/api/attendance', tenantMiddleware, auditMiddleware, attendanceRoutes);
app.use('/api/fees', tenantMiddleware, auditMiddleware, feesRoutes);
app.use('/api/exams', tenantMiddleware, auditMiddleware, examRoutes);
app.use('/api/homework', tenantMiddleware, auditMiddleware, homeworkRoutes);
app.use('/api/notice-board', tenantMiddleware, auditMiddleware, noticeBoardRoutes);
app.use('/api/parents', tenantMiddleware, auditMiddleware, parentRoutes);
app.use('/api/accounting', tenantMiddleware, auditMiddleware, accountingRoutes);
app.use('/api/classes', tenantMiddleware, auditMiddleware, classRoutes);
app.use('/api/timetable', tenantMiddleware, auditMiddleware, timetableRoutes);
app.use('/api/leaves', tenantMiddleware, auditMiddleware, leaveRoutes);
app.use('/api/dashboard', tenantMiddleware, dashboardRoutes);
app.use('/api/scholarships', tenantMiddleware, auditMiddleware, scholarshipRoutes);
app.use('/api/reports', tenantMiddleware, reportRoutes);
app.use('/api/upload', tenantMiddleware, uploadRoutes);
app.use('/api/notifications', tenantMiddleware, auditMiddleware, notificationRoutes);

// ─── 404 Handler ───────────────────────────────────────────────────────────────
app.all('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: `Route ${req.originalUrl} not found`
  });
});

// ─── Global Error Handler ──────────────────────────────────────────────────────
app.use(errorHandler);

// ─── Start Server ──────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 5000;
const httpServer = http.createServer(app);
initSocket(httpServer);

const startServer = async () => {
  try {
    await connectGlobalDB();
    httpServer.listen(PORT, () => {
      logger.info(`🚀 Rural School ERP Backend running on port ${PORT}`);
      logger.info(`📊 Environment: ${process.env.NODE_ENV}`);
      logger.info(`🌐 Global DB connected`);
    });
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
};

startServer();

// Handle unhandled rejections
process.on('unhandledRejection', (err) => {
  logger.error('UNHANDLED REJECTION:', err);
  process.exit(1);
});

process.on('uncaughtException', (err) => {
  logger.error('UNCAUGHT EXCEPTION:', err);
  process.exit(1);
});

module.exports = app;
