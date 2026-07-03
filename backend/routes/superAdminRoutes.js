'use strict';

const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/superAdminController');
const { protect, restrictTo } = require('../middleware/authMiddleware');
const { validate, SCHEMAS } = require('../middleware/validateMiddleware');

router.use(protect, restrictTo('super_admin'));

router.get('/dashboard', ctrl.getDashboard);
router.get('/schools', ctrl.getAllSchools);
router.post('/schools', validate(SCHEMAS.createSchool), ctrl.createSchool);
router.get('/schools/:id', ctrl.getSchoolById);
router.put('/schools/:id', ctrl.updateSchool);
router.patch('/schools/:id/status', ctrl.updateSchoolStatus);
router.put('/schools/:id/subscription', ctrl.updateSubscription);
router.get('/users', ctrl.getAllUsers);
router.get('/audit-logs', ctrl.getAuditLogs);
router.post('/sync-stats', ctrl.syncAllStats);
router.get('/cache-status', ctrl.getCacheStatus);
router.delete('/cache', ctrl.clearAllCache);
router.delete('/schools/:id/cache', ctrl.clearSchoolCache);
router.post('/migrate-db-uris', ctrl.migrateAllDbUris);

module.exports = router;
