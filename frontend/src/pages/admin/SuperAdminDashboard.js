import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { superAdminAPI } from '../../api';
import { StatCard, Card, PageLoader } from '../../components/common';
import toast from 'react-hot-toast';

export default function SuperAdminDashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [clearingCache, setClearingCache] = useState(false);
  const [migrating, setMigrating] = useState(false);
  const [cacheCount, setCacheCount] = useState(null);
  const navigate = useNavigate();

  const loadDashboard = () => {
    setLoading(true);
    superAdminAPI.getDashboard()
      .then(r => setData(r.data.data))
      .catch(() => toast.error('Failed to load dashboard'))
      .finally(() => setLoading(false));
  };

  const loadCacheCount = () => {
    superAdminAPI.getCacheStatus()
      .then(r => setCacheCount(r.data.data.count))
      .catch(() => {});
  };

  useEffect(() => { loadDashboard(); loadCacheCount(); }, []);

  const handleSyncStats = async () => {
    setSyncing(true);
    try {
      const { data: res } = await superAdminAPI.syncStats();
      toast.success(res.message || 'Stats synced!');
      loadDashboard();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Sync failed');
    } finally { setSyncing(false); }
  };

  const handleMigrateDbUris = async () => {
    if (!window.confirm(
      'This will update ALL school dbUri fields to use the current MONGO_GLOBAL_URI from .env and flush all cached connections.\n\nOnly run this after changing your MongoDB URI in .env and restarting the server. Continue?'
    )) return;
    setMigrating(true);
    try {
      const { data: res } = await superAdminAPI.migrateDbUris();
      toast.success(res.message || 'Migration complete!');
      loadCacheCount();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Migration failed');
    } finally { setMigrating(false); }
  };

  const handleClearCache = async () => {
    if (!window.confirm('Clear all cached tenant DB connections? Each school will reconnect fresh on its next request.')) return;
    setClearingCache(true);
    try {
      const { data: res } = await superAdminAPI.clearAllCache();
      toast.success(res.message || 'Cache cleared!');
      loadCacheCount();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to clear cache');
    } finally { setClearingCache(false); }
  };

  if (loading) return <PageLoader message="Loading dashboard..." />;
  const { overview = {}, recentSchools = [], planDistribution = [] } = data || {};

  return (
    <div>
      <div className="page-header">
        <div className="page-header-left">
          <h1>Platform Dashboard</h1>
          <p>Overview of all schools on the platform</p>
        </div>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <button className="btn btn-ghost" onClick={handleSyncStats} disabled={syncing} title="Recalculate student/teacher counts from each school DB">
            {syncing ? '⏳ Syncing...' : '🔄 Sync Stats'}
          </button>
          <button className="btn btn-ghost" onClick={handleClearCache} disabled={clearingCache} title="Close cached tenant DB connections (forces a fresh reconnect)">
            {clearingCache ? '⏳ Clearing...' : `🧹 Clear Cache${cacheCount !== null ? ` (${cacheCount})` : ''}`}
          </button>
          <button className="btn btn-ghost" onClick={handleMigrateDbUris} disabled={migrating} title="After changing MONGO_GLOBAL_URI in .env, run this to update all school DB URIs">
            {migrating ? '⏳ Migrating...' : '🔁 Migrate DB URIs'}
          </button>
          <button className="btn btn-primary" onClick={() => navigate('/super-admin/schools/create')}>
            + Create School
          </button>
        </div>
      </div>

      <div className="grid-4 mb-5">
        <StatCard icon="🏫" label="Total Schools"  value={overview.totalSchools}  color="#1e3a5f" bg="#e8f0fe" />
        <StatCard icon="✅" label="Active Schools" value={overview.activeSchools}  color="#16a34a" bg="#f0fdf4" />
        <StatCard icon="👨‍🎓" label="Total Students" value={overview.totalStudents?.toLocaleString()} color="#0284c7" bg="#f0f9ff" />
        <StatCard icon="👩‍🏫" label="Total Teachers" value={overview.totalTeachers?.toLocaleString()} color="#7c3aed" bg="#f5f3ff" />
      </div>

      <div className="grid-2">
        <Card title="Recent Schools" action={
          <button className="btn btn-ghost btn-sm" onClick={() => navigate('/super-admin/schools')}>View All</button>
        }>
          {recentSchools.map(school => (
            <div key={school._id} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'10px 0', borderBottom:'1px solid var(--gray-100)' }}>
              <div>
                <div style={{ fontWeight:600, fontSize:'0.9rem' }}>{school.name}</div>
                <div style={{ fontSize:'0.75rem', color:'var(--gray-400)' }}>{school.schoolCode} &bull; {school.address?.district}</div>
              </div>
              <span className={`badge badge-${school.status === 'active' ? 'success' : 'gray'}`}>{school.status}</span>
            </div>
          ))}
        </Card>

        <Card title="Subscription Plans">
          {planDistribution.map(p => {
            const pct = overview.totalSchools > 0 ? Math.round(p.count / overview.totalSchools * 100) : 0;
            const colors = { free:'#6b7280', basic:'#0284c7', standard:'#16a34a', premium:'#7c3aed', enterprise:'#f5a623' };
            return (
              <div key={p._id} style={{ marginBottom:14 }}>
                <div style={{ display:'flex', justifyContent:'space-between', marginBottom:4 }}>
                  <span style={{ fontSize:'0.875rem', fontWeight:500, textTransform:'capitalize' }}>{p._id}</span>
                  <span style={{ fontSize:'0.8rem', color:'var(--gray-500)' }}>{p.count} ({pct}%)</span>
                </div>
                <div className="progress-bar">
                  <div className="progress-fill" style={{ width:`${pct}%`, background: colors[p._id] || '#6b7280' }} />
                </div>
              </div>
            );
          })}
        </Card>
      </div>
    </div>
  );
}
