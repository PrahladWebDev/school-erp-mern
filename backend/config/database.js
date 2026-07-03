'use strict';

const mongoose = require('mongoose');
const { logger } = require('../utils/logger');

// Store tenant connections in memory
const tenantConnections = new Map();

// ─── Global DB Connection ──────────────────────────────────────────────────────
const connectGlobalDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGO_GLOBAL_URI, {
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
      family: 4
    });
    logger.info(`Global DB Connected: ${conn.connection.host}`);
    return conn;
  } catch (error) {
    logger.error('Global DB Connection Error:', error.message);
    throw error;
  }
};

// ─── Tenant DB Connection (per school) ────────────────────────────────────────
const getTenantConnection = async (schoolId, dbUri) => {
  // Check cache first
  if (tenantConnections.has(schoolId)) {
    const cached = tenantConnections.get(schoolId);
    if (cached.readyState === 1) {
      return cached;
    }
    tenantConnections.delete(schoolId);
  }

  try {
    const conn = await mongoose.createConnection(dbUri, {
      maxPoolSize: 5,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
      family: 4
    });

    conn.on('error', (err) => {
      logger.error(`Tenant DB ${schoolId} error:`, err);
      tenantConnections.delete(schoolId);
    });

    conn.on('disconnected', () => {
      logger.warn(`Tenant DB ${schoolId} disconnected`);
      tenantConnections.delete(schoolId);
    });

    tenantConnections.set(schoolId, conn);
    logger.info(`Tenant DB Connected for school: ${schoolId}`);
    return conn;
  } catch (error) {
    logger.error(`Tenant DB Connection Error for ${schoolId}:`, error.message);
    throw error;
  }
};

// ─── Close specific tenant connection ─────────────────────────────────────────
const closeTenantConnection = async (schoolId) => {
  if (tenantConnections.has(schoolId)) {
    const conn = tenantConnections.get(schoolId);
    await conn.close();
    tenantConnections.delete(schoolId);
    logger.info(`Tenant DB closed for school: ${schoolId}`);
  }
};

// ─── Close all connections ─────────────────────────────────────────────────────
// Used for full server shutdown — also closes the global DB connection.
const closeAllConnections = async () => {
  for (const [schoolId, conn] of tenantConnections) {
    await conn.close();
    logger.info(`Closed DB for school: ${schoolId}`);
  }
  tenantConnections.clear();
  await mongoose.connection.close();
  logger.info('All DB connections closed');
};

// ─── Clear tenant connection cache ────────────────────────────────────────────
// Unlike closeAllConnections(), this only drops cached TENANT connections —
// the global DB connection is left untouched. Safe to call at runtime
// (e.g. from a super-admin "clear cache" action) without taking the app down.
// Stale/leaked connections that are already disconnected are also removed.
const clearTenantCacheEntry = async (schoolId) => {
  if (!tenantConnections.has(schoolId)) return false;
  const conn = tenantConnections.get(schoolId);
  try {
    if (conn.readyState !== 0) await conn.close();
  } catch (err) {
    logger.warn(`Error closing tenant connection ${schoolId} during cache clear: ${err.message}`);
  }
  tenantConnections.delete(schoolId);
  logger.info(`Tenant cache cleared for school: ${schoolId}`);
  return true;
};

const clearAllTenantCache = async () => {
  const schoolIds = Array.from(tenantConnections.keys());
  let cleared = 0;
  for (const schoolId of schoolIds) {
    const didClear = await clearTenantCacheEntry(schoolId);
    if (didClear) cleared++;
  }
  logger.info(`Tenant cache cleared for ${cleared} school(s)`);
  return cleared;
};

// ─── Inspect tenant connection cache ──────────────────────────────────────────
const READY_STATE_LABELS = { 0: 'disconnected', 1: 'connected', 2: 'connecting', 3: 'disconnecting' };

const getTenantCacheInfo = () => {
  return Array.from(tenantConnections.entries()).map(([schoolId, conn]) => ({
    schoolId,
    readyState: conn.readyState,
    status: READY_STATE_LABELS[conn.readyState] || 'unknown'
  }));
};

// ─── Build a tenant DB URI from MONGO_GLOBAL_URI ──────────────────────────────
// Takes the global connection string and swaps in a different database name,
// while preserving any query string (?retryWrites=true&w=majority etc.)
const buildTenantDbUri = (dbName) => {
  const globalUri = process.env.MONGO_GLOBAL_URI;
  if (!globalUri) throw new Error('MONGO_GLOBAL_URI is not set');

  const [base, query] = globalUri.split('?');
  const withoutDbName = base.replace(/\/[^/]+$/, '/'); // strip trailing /dbname
  return query ? `${withoutDbName}${dbName}?${query}` : `${withoutDbName}${dbName}`;
};

// ─── Get tenant DB stats ───────────────────────────────────────────────────────
const getTenantConnectionCount = () => tenantConnections.size;

module.exports = {
  connectGlobalDB,
  getTenantConnection,
  closeTenantConnection,
  closeAllConnections,
  clearTenantCacheEntry,
  clearAllTenantCache,
  getTenantCacheInfo,
  getTenantConnectionCount,
  buildTenantDbUri
};
