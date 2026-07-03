'use strict';

const mongoose = require('mongoose');
const School = require('../models/global/School');
const User = require('../models/global/User');
const AuditLog = require('../models/global/AuditLog');
const AppError = require('../utils/AppError');
const { logger } = require('../utils/logger');
const {  buildTenantDbUri } = require('../config/database');

// ─── @POST /api/super-admin/schools ───────────────────────────────────────────
const createSchool = async (req, res, next) => {
  try {
    const {
      name, type, board, medium, email, phone, address,
      adminName, adminEmail, adminMobile, adminPassword,
      subscriptionPlan, location, logo
    } = req.body;

    // Generate school code
    const schoolCode = name
      .toUpperCase()
      .replace(/[^A-Z0-9]/g, '')
      .slice(0, 6) + Date.now().toString().slice(-4);

    // Generate tenant DB name
    const dbName = `school_${schoolCode.toLowerCase()}_${Date.now()}`;
   const dbUri = buildTenantDbUri(dbName);

    // Create school record
    const school = await School.create({
      schoolCode,
      name, type, board, medium, email, phone,
      address,
      dbUri,
      dbName,
      adminEmail,
      ...(location?.lat && location?.lng ? { location: { lat: parseFloat(location.lat), lng: parseFloat(location.lng) } } : {}),
      ...(logo?.url ? { logo } : {}),
      subscription: {
        planName: subscriptionPlan || 'basic',
        maxStudents: 500,
        maxTeachers: 50
      }
    });

    // Create school admin user
    const adminUser = await User.create({
      name: adminName,
      email: adminEmail,
      mobile: adminMobile,
      password: adminPassword,
      role: 'school_admin',
      schoolId: school._id,
      schoolCode: school.schoolCode,
      isActive: true
    });

    // Link admin to school
    await School.findByIdAndUpdate(school._id, { adminUserId: adminUser._id });

    logger.info(`New school created: ${school.name} (${school.schoolCode})`);

    res.status(201).json({
      success: true,
      message: 'School created successfully',
      data: {
        school: {
          id: school._id,
          name: school.name,
          schoolCode: school.schoolCode,
          slug: school.slug,
          status: school.status
        },
        admin: {
          id: adminUser._id,
          name: adminUser.name,
          email: adminUser.email
        }
      }
    });
  } catch (err) {
    next(err);
  }
};

// ─── @GET /api/super-admin/schools ────────────────────────────────────────────
const getAllSchools = async (req, res, next) => {
  try {
    const {
      page = 1, limit = 20, search, status,
      plan, sortBy = 'createdAt', sortOrder = 'desc'
    } = req.query;

    const filter = {};
    if (status) filter.status = status;
    if (plan) filter['subscription.planName'] = plan;
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { schoolCode: { $regex: search, $options: 'i' } },
        { adminEmail: { $regex: search, $options: 'i' } }
      ];
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const sort = { [sortBy]: sortOrder === 'asc' ? 1 : -1 };

    const [schools, total] = await Promise.all([
      School.find(filter)
        .select('-dbUri')
        .sort(sort)
        .skip(skip)
        .limit(parseInt(limit))
        .lean(),
      School.countDocuments(filter)
    ]);

    res.json({
      success: true,
      data: {
        schools,
        pagination: {
          total, page: parseInt(page),
          limit: parseInt(limit),
          pages: Math.ceil(total / parseInt(limit))
        }
      }
    });
  } catch (err) {
    next(err);
  }
};

// ─── @GET /api/super-admin/schools/:id ────────────────────────────────────────
const getSchoolById = async (req, res, next) => {
  try {
    const school = await School.findById(req.params.id).select('-dbUri').lean();
    if (!school) return next(new AppError('School not found', 404));
    res.json({ success: true, data: { school } });
  } catch (err) {
    next(err);
  }
};

// ─── @PATCH /api/super-admin/schools/:id/status ───────────────────────────────
const updateSchoolStatus = async (req, res, next) => {
  try {
    const { status, reason } = req.body;
    const validStatuses = ['active', 'inactive', 'suspended'];
    if (!validStatuses.includes(status)) {
      return next(new AppError(`Invalid status. Allowed: ${validStatuses.join(', ')}`, 400));
    }

    const school = await School.findByIdAndUpdate(
      req.params.id,
      { status },
      { new: true }
    ).select('-dbUri');

    if (!school) return next(new AppError('School not found', 404));

    logger.info(`School ${school.schoolCode} status changed to ${status} by super admin`);
    res.json({ success: true, message: `School ${status}`, data: { school } });
  } catch (err) {
    next(err);
  }
};

// ─── @PUT /api/super-admin/schools/:id/subscription ───────────────────────────
const updateSubscription = async (req, res, next) => {
  try {
    const { planName, maxStudents, maxTeachers, endDate, features } = req.body;

    const school = await School.findByIdAndUpdate(
      req.params.id,
      {
        $set: {
          'subscription.planName': planName,
          'subscription.maxStudents': maxStudents,
          'subscription.maxTeachers': maxTeachers,
          'subscription.endDate': endDate,
          'subscription.features': features,
          'subscription.isActive': true
        }
      },
      { new: true }
    ).select('-dbUri');

    if (!school) return next(new AppError('School not found', 404));
    res.json({ success: true, message: 'Subscription updated', data: { school } });
  } catch (err) {
    next(err);
  }
};

// ─── @GET /api/super-admin/dashboard ──────────────────────────────────────────
const getDashboard = async (req, res, next) => {
  try {
    const [
      totalSchools,
      activeSchools,
      suspendedSchools,
      totalUsers,
      recentSchools,
      planDistribution
    ] = await Promise.all([
      School.countDocuments(),
      School.countDocuments({ status: 'active' }),
      School.countDocuments({ status: 'suspended' }),
      User.countDocuments(),
      School.find().select('-dbUri').sort({ createdAt: -1 }).limit(5).lean(),
      School.aggregate([
        { $group: { _id: '$subscription.planName', count: { $sum: 1 } } }
      ])
    ]);

    // Sum up stats from all schools
    const statsAgg = await School.aggregate([
      { $group: {
        _id: null,
        totalStudents: { $sum: '$stats.totalStudents' },
        totalTeachers: { $sum: '$stats.totalTeachers' }
      }}
    ]);
    const stats = statsAgg[0] || { totalStudents: 0, totalTeachers: 0 };

    res.json({
      success: true,
      data: {
        overview: {
          totalSchools,
          activeSchools,
          suspendedSchools,
          inactiveSchools: totalSchools - activeSchools - suspendedSchools,
          totalUsers,
          totalStudents: stats.totalStudents,
          totalTeachers: stats.totalTeachers
        },
        recentSchools,
        planDistribution
      }
    });
  } catch (err) {
    next(err);
  }
};

// ─── @GET /api/super-admin/audit-logs ─────────────────────────────────────────
const getAuditLogs = async (req, res, next) => {
  try {
    const { page = 1, limit = 50, schoolId, userId, action, module, startDate, endDate } = req.query;
    const filter = {};
    if (schoolId) filter.schoolId = schoolId;
    if (userId) filter.userId = userId;
    if (action) filter.action = action;
    if (module) filter.module = module;
    if (startDate || endDate) {
      filter.timestamp = {};
      if (startDate) filter.timestamp.$gte = new Date(startDate);
      if (endDate) filter.timestamp.$lte = new Date(endDate);
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const [logs, total] = await Promise.all([
      AuditLog.find(filter).sort({ timestamp: -1 }).skip(skip).limit(parseInt(limit)).lean(),
      AuditLog.countDocuments(filter)
    ]);

    res.json({
      success: true,
      data: {
        logs,
        pagination: { total, page: parseInt(page), limit: parseInt(limit), pages: Math.ceil(total / parseInt(limit)) }
      }
    });
  } catch (err) {
    next(err);
  }
};

// ─── @GET /api/super-admin/users ──────────────────────────────────────────────
const getAllUsers = async (req, res, next) => {
  try {
    const { page = 1, limit = 20, role, schoolId, search } = req.query;
    const filter = {};
    if (role) filter.role = role;
    if (schoolId) filter.schoolId = schoolId;
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } }
      ];
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const [users, total] = await Promise.all([
      User.find(filter).sort({ createdAt: -1 }).skip(skip).limit(parseInt(limit)).lean(),
      User.countDocuments(filter)
    ]);

    res.json({
      success: true,
      data: { users, pagination: { total, page: parseInt(page), limit: parseInt(limit), pages: Math.ceil(total / parseInt(limit)) } }
    });
  } catch (err) {
    next(err);
  }
};

// ─── @POST /api/super-admin/sync-stats ────────────────────────────────────────
// Recalculates student/teacher counts from each school's tenant DB and saves
// them back to the School document.  Call this once to fix stale counters.
const syncAllStats = async (req, res, next) => {
  try {
    const { getTenantConnection } = require('../config/database');
    const getTenantModels = require('../models/tenant/index');

    // dbUri has `select: false` on the schema, so it must be requested explicitly
    const schools = await School.find({ status: 'active' }).select('+dbUri').lean();
    let updated = 0;
    let failed = 0;

    await Promise.all(schools.map(async (school) => {
      try {
        if (!school.dbUri) throw new Error('Missing dbUri');

        const conn = await getTenantConnection(school._id.toString(), school.dbUri);
        const { Student, Teacher } = getTenantModels(conn);

        const [totalStudents, totalTeachers] = await Promise.all([
          Student.countDocuments({ status: 'active' }),
          Teacher.countDocuments({ status: 'active' })
        ]);

        await School.findByIdAndUpdate(school._id, {
          'stats.totalStudents': totalStudents,
          'stats.totalTeachers': totalTeachers,
          'stats.lastUpdated': new Date()
        });
        updated++;
      } catch (err) {
        failed++;
        logger.warn(`Sync stats skipped for school ${school.schoolCode || school._id}: ${err.message}`);
      }
    }));

    res.json({
      success: true,
      message: `Stats synced for ${updated} school(s)${failed ? `, ${failed} skipped (unreachable DB)` : ''}`
    });
  } catch (err) {
    next(err);
  }
};

// ─── @GET /api/super-admin/cache-status ───────────────────────────────────────
// Lists every currently-cached tenant DB connection (in-memory pool), joined
// with school name/code so the super admin can see which schools have a
// live connection open and whether it's healthy.
const getCacheStatus = async (req, res, next) => {
  try {
    const { getTenantCacheInfo, getTenantConnectionCount } = require('../config/database');
    const cacheInfo = getTenantCacheInfo();

    const schoolIds = cacheInfo.map(c => c.schoolId);
    const schools = await School.find({ _id: { $in: schoolIds } })
      .select('name schoolCode')
      .lean();
    const schoolMap = new Map(schools.map(s => [s._id.toString(), s]));

    const cache = cacheInfo.map(c => ({
      ...c,
      schoolName: schoolMap.get(c.schoolId)?.name || '(deleted school)',
      schoolCode: schoolMap.get(c.schoolId)?.schoolCode || null
    }));

    res.json({
      success: true,
      data: { count: getTenantConnectionCount(), cache }
    });
  } catch (err) {
    next(err);
  }
};

// ─── @DELETE /api/super-admin/schools/:id/cache ───────────────────────────────
// Drops the cached tenant DB connection for a single school. The next request
// for that school will open a fresh connection. Useful after a school's
// dbUri changes, or to recover from a stuck/stale connection.
const clearSchoolCache = async (req, res, next) => {
  try {
    const { clearTenantCacheEntry } = require('../config/database');
    const school = await School.findById(req.params.id).select('name schoolCode').lean();
    if (!school) return next(new AppError('School not found', 404));

    const wasCached = await clearTenantCacheEntry(req.params.id);
    logger.info(`Tenant cache cleared for ${school.schoolCode} by super admin`);

    res.json({
      success: true,
      message: wasCached
        ? `Cache cleared for ${school.name}`
        : `${school.name} had no cached connection`
    });
  } catch (err) {
    next(err);
  }
};

// ─── @DELETE /api/super-admin/cache ────────────────────────────────────────────
// Drops ALL cached tenant DB connections (global DB connection is untouched).
const clearAllCache = async (req, res, next) => {
  try {
    const { clearAllTenantCache } = require('../config/database');
    const cleared = await clearAllTenantCache();
    logger.info(`All tenant cache cleared by super admin (${cleared} connection(s))`);
    res.json({ success: true, message: `Cleared cache for ${cleared} school(s)` });
  } catch (err) {
    next(err);
  }
};

// ─── @PUT /api/super-admin/schools/:id ────────────────────────────────────────
// Updates school info. If the school name changes the dbName/dbUri are
// regenerated so the tenant always connects to the correct database.
// The in-memory connection cache for that school is flushed automatically so
// the very next request picks up the new URI instead of the stale one.
const updateSchool = async (req, res, next) => {
  try {
    const { clearTenantCacheEntry } = require('../config/database');

    const school = await School.findById(req.params.id).select('+dbUri');
    if (!school) return next(new AppError('School not found', 404));

    const allowed = [
      'name', 'shortName', 'type', 'board', 'medium',
      'email', 'phone', 'website', 'address',
      'primaryColor', 'secondaryColor',
      'workingDays', 'currentAcademicYear',
      'location', 'logo'
    ];

    const updates = {};
    allowed.forEach(f => { if (req.body[f] !== undefined) updates[f] = req.body[f]; });

    // ── Regenerate dbName / dbUri when name changes ──────────────────────────
    // The dbName encodes the schoolCode (derived from the original name).
    // When an admin renames a school we rebuild both so the stored value stays
    // consistent with what is actually in MongoDB and stale cache is dropped.
    if (updates.name && updates.name !== school.name) {
      const newSchoolCode = updates.name
        .toUpperCase()
        .replace(/[^A-Z0-9]/g, '')
        .slice(0, 6) + school.schoolCode.slice(-4); // keep original numeric suffix

     const newDbName = `school_${newSchoolCode.toLowerCase()}`;

updates.schoolCode = newSchoolCode;
updates.dbName    = newDbName;
updates.dbUri     = buildTenantDbUri(newDbName);

      // Drop stale in-memory tenant connection so next request reconnects
      await clearTenantCacheEntry(req.params.id);
      logger.info(`School ${school.schoolCode} renamed → ${newSchoolCode}; tenant cache cleared`);
    }

    const updated = await School.findByIdAndUpdate(
      req.params.id,
      updates,
      { new: true, runValidators: true }
    ).select('-dbUri');

    if (!updated) return next(new AppError('School not found', 404));

    res.json({ success: true, message: 'School updated successfully', data: { school: updated } });
  } catch (err) {
    next(err);
  }
};

// ─── @POST /api/super-admin/migrate-db-uris ───────────────────────────────────
// After changing MONGO_GLOBAL_URI in .env (and restarting), all existing school
// records still store the OLD cluster URI in their dbUri field. This endpoint
// rebuilds every school's dbUri from the current MONGO_GLOBAL_URI so tenant
// connections point to the new cluster. All cached connections are also flushed.
const migrateAllDbUris = async (req, res, next) => {
  try {
    const { clearAllTenantCache } = require('../config/database');

   if (!process.env.MONGO_GLOBAL_URI) return next(new AppError('MONGO_GLOBAL_URI is not set in environment', 500));

    const schools = await School.find({}).select('+dbUri').lean();
    if (!schools.length) {
      return res.json({ success: true, message: 'No schools found to migrate', data: { updated: 0 } });
    }

    const results = [];
    for (const school of schools) {
   const newDbUri = buildTenantDbUri(school.dbName);
      if (newDbUri === school.dbUri) {
        results.push({ schoolCode: school.schoolCode, status: 'skipped — URI unchanged' });
        continue;
      }
      await School.findByIdAndUpdate(school._id, { dbUri: newDbUri });
      results.push({ schoolCode: school.schoolCode, dbName: school.dbName, status: 'updated' });
    }

    // Flush all cached connections so next request reconnects to new cluster
    const cleared = await clearAllTenantCache();

    const updatedCount = results.filter(r => r.status === 'updated').length;
    logger.info(`DB URI migration complete: ${updatedCount} school(s) updated, ${cleared} cache(s) cleared`);

    res.json({
      success: true,
      message: `Migration complete. ${updatedCount} school(s) updated, ${cleared} cached connection(s) flushed.`,
      data: { updated: updatedCount, cacheCleared: cleared, results }
    });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  createSchool, getAllSchools, getSchoolById,
  updateSchool, updateSchoolStatus, updateSubscription,
  getDashboard, getAuditLogs, getAllUsers, syncAllStats,
  getCacheStatus, clearSchoolCache, clearAllCache,
  migrateAllDbUris
};
