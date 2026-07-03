'use strict';

const { logger } = require('../utils/logger');

// ─── Error Type Handlers ───────────────────────────────────────────────────────
const handleCastErrorDB = (err) => {
  const message = `Invalid ${err.path}: ${err.value}`;
  return { statusCode: 400, message };
};

const handleDuplicateFieldsDB = (err) => {
  const field = Object.keys(err.keyValue || {})[0];
  const value = err.keyValue ? err.keyValue[field] : 'unknown';
  const message = `Duplicate value for field '${field}': '${value}'. Please use a different value.`;
  return { statusCode: 400, message };
};

const handleValidationErrorDB = (err) => {
  const errors = Object.values(err.errors).map(e => ({
    field: e.path,
    message: e.message
  }));
  return {
    statusCode: 400,
    message: 'Validation failed',
    errors
  };
};

const handleJWTError = () => ({
  statusCode: 401,
  message: 'Invalid token. Please log in again.'
});

const handleJWTExpiredError = () => ({
  statusCode: 401,
  message: 'Your session has expired. Please log in again.'
});

const handleMulterError = (err) => ({
  statusCode: 400,
  message: err.message || 'File upload error'
});

// ─── Main Error Handler ────────────────────────────────────────────────────────
const errorHandler = (err, req, res, next) => {
  let statusCode = err.statusCode || 500;
  let message = err.message || 'Something went wrong';
  let errors = err.errors || null;

  // Log error
  if (statusCode >= 500) {
    logger.error({
      message: err.message,
      stack: err.stack,
      url: req.originalUrl,
      method: req.method,
      ip: req.ip,
      userId: req.user?._id
    });
  }

  // Mongoose CastError (invalid ObjectId)
  if (err.name === 'CastError') {
    const e = handleCastErrorDB(err);
    statusCode = e.statusCode;
    message = e.message;
  }

  // Duplicate key
  if (err.code === 11000) {
    const e = handleDuplicateFieldsDB(err);
    statusCode = e.statusCode;
    message = e.message;
  }

  // Mongoose ValidationError
  if (err.name === 'ValidationError') {
    const e = handleValidationErrorDB(err);
    statusCode = e.statusCode;
    message = e.message;
    errors = e.errors;
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError') {
    const e = handleJWTError();
    statusCode = e.statusCode;
    message = e.message;
  }
  if (err.name === 'TokenExpiredError') {
    const e = handleJWTExpiredError();
    statusCode = e.statusCode;
    message = e.message;
  }

  // Multer errors
  if (err.name === 'MulterError') {
    const e = handleMulterError(err);
    statusCode = e.statusCode;
    message = e.message;
  }

  // Send response
  const response = {
    success: false,
    status: statusCode >= 500 ? 'error' : 'fail',
    message
  };

  if (errors) response.errors = errors;

  // Dev: include stack trace
  if (process.env.NODE_ENV === 'development') {
    response.stack = err.stack;
  }

  res.status(statusCode).json(response);
};

module.exports = errorHandler;
