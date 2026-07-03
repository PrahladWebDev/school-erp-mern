'use strict';

const School = require('../models/global/School');
const { getTenantConnection } = require('../config/database');
const getTenantModels = require('../models/tenant/index');
const AppError = require('../utils/AppError');

/**
 * Resolves tenant school from:
 * 1. x-school-id or x-tenant-id header
 * 2. JWT payload (req.user.schoolId set by authMiddleware)
 * 3. Subdomain (optional)
 * Attaches req.tenantDb (models) and req.school to every tenant request.
 */
const tenantMiddleware = async (req, res, next) => {
  try {
    let schoolId = null;

    // Priority 1: header
    const headerSchoolId = req.headers['x-school-id'] || req.headers['x-tenant-id'];
    if (headerSchoolId) schoolId = headerSchoolId;

    // Priority 2: JWT (set by protect middleware, if already authenticated)
    if (!schoolId && req.user && req.user.schoolId) {
      schoolId = req.user.schoolId.toString();
    }

    // Priority 3: subdomain (e.g. school-code.app.com)
    if (!schoolId) {
      const host = req.hostname;
      const parts = host.split('.');
      if (parts.length >= 3) {
        const subdomain = parts[0];
        const school = await School.findOne({ slug: subdomain, status: 'active' })
          .select('+dbUri')
          .lean();
        if (school) {
          schoolId = school._id.toString();
          req.schoolId = schoolId;
          req.school = school;
          const conn = await getTenantConnection(schoolId, school.dbUri);
          req.tenantDb = getTenantModels(conn);
          return next();
        }
      }
    }

    if (!schoolId) {
      return next(new AppError('School identifier is required. Pass x-school-id header.', 400));
    }

    // Load school if not already loaded
    if (!req.school || req.school._id.toString() !== schoolId) {
      const school = await School.findById(schoolId)
        .select('+dbUri')
        .lean();

      if (!school) {
        return next(new AppError('School not found', 404));
      }
      if (school.status !== 'active') {
        return next(new AppError(`School account is ${school.status}. Please contact support.`, 403));
      }

      req.school = school;
    }

    req.schoolId = schoolId;

    // Get/create tenant DB connection and models
    const conn = await getTenantConnection(schoolId, req.school.dbUri);
    req.tenantDb = getTenantModels(conn);

    next();
  } catch (err) {
    next(err);
  }
};

module.exports = tenantMiddleware;
