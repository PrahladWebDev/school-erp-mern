import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { superAdminAPI } from '../../api';
import { SearchInput, Pagination, PageLoader, EmptyState } from '../../components/common';
import toast from 'react-hot-toast';

export default function SchoolsList() {
  const navigate = useNavigate();
  const [schools, setSchools] = useState([]);
  const [pagination, setPagination] = useState({});
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);

  const load = async () => {
    setLoading(true);
    try {
      const { data } = await superAdminAPI.getSchools({ page, limit:15, search, status });
      setSchools(data.data.schools || []);
      setPagination(data.data.pagination || {});
    } catch { toast.error('Failed to load schools'); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [page, search, status]);

  const handleStatusChange = async (id, newStatus) => {
    try {
      await superAdminAPI.updateSchoolStatus(id, { status: newStatus });
      toast.success(`School ${newStatus}`);
      load();
    } catch { toast.error('Failed to update status'); }
  };

  const handleClearCache = async (id) => {
    try {
      const { data } = await superAdminAPI.clearSchoolCache(id);
      toast.success(data.message || 'Cache cleared');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to clear cache');
    }
  };

  const PLAN_COLOR = { free:'#6b7280', basic:'#0284c7', standard:'#16a34a', premium:'#7c3aed', enterprise:'#f5a623' };

  return (
    <div>
      <div className="page-header">
        <div className="page-header-left">
          <h1>All Schools</h1>
          <p>{pagination.total || 0} schools on platform</p>
        </div>
        <button className="btn btn-primary" onClick={() => navigate('/super-admin/schools/create')}>+ Create School</button>
      </div>

      <div className="card mb-5">
        <div className="filter-bar">
          <SearchInput value={search} onChange={v => { setSearch(v); setPage(1); }} placeholder="Search school name, code..." />
          <select className="form-select" style={{ width:130 }} value={status} onChange={e => { setStatus(e.target.value); setPage(1); }}>
            <option value="">All Status</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
            <option value="suspended">Suspended</option>
          </select>
        </div>
      </div>

      {loading ? <PageLoader /> : schools.length === 0 ? (
        <EmptyState icon="🏫" title="No schools found" />
      ) : (
        <div className="card">
          <div className="table-wrapper">
            <table>
              <thead><tr><th>School</th><th>Code</th><th>Location</th><th>Plan</th><th>Students</th><th>Status</th><th>Actions</th></tr></thead>
              <tbody>
                {schools.map(s => (
                  <tr key={s._id}>
                    <td>
                      <div style={{ fontWeight:600 }}>{s.name}</div>
                      <div style={{ fontSize:'0.75rem', color:'var(--gray-400)' }}>{s.adminEmail}</div>
                    </td>
                    <td><code style={{ background:'var(--gray-100)', padding:'2px 6px', borderRadius:4, fontSize:'0.8rem' }}>{s.schoolCode}</code></td>
                    <td style={{ fontSize:'0.875rem' }}>{s.address?.district}, {s.address?.state}</td>
                    <td>
                      <span style={{
                        fontSize:'0.72rem', fontWeight:700, padding:'3px 8px', borderRadius:999, textTransform:'capitalize',
                        background:(PLAN_COLOR[s.subscription?.planName]||'#6b7280')+'20',
                        color: PLAN_COLOR[s.subscription?.planName]||'#6b7280'
                      }}>{s.subscription?.planName || 'basic'}</span>
                    </td>
                    <td style={{ fontWeight:500 }}>{s.stats?.totalStudents || 0}</td>
                    <td><span className={`badge badge-${s.status==='active'?'success':s.status==='suspended'?'danger':'gray'}`}>{s.status}</span></td>
                    <td>
                      <div style={{ display:'flex', gap:6 }}>
                        <button className="btn btn-sm btn-outline"
                          onClick={() => navigate(`/super-admin/schools/${s._id}/edit`)}>✏️ Edit</button>
                        {s.status === 'active'
                          ? <button className="btn btn-sm" style={{ background:'var(--danger-bg)',color:'var(--danger)',border:'none' }}
                              onClick={() => handleStatusChange(s._id,'suspended')}>Suspend</button>
                          : <button className="btn btn-sm btn-outline"
                              onClick={() => handleStatusChange(s._id,'active')}>Activate</button>
                        }
                        <button className="btn btn-sm btn-outline" title="Drop this school's cached DB connection"
                          onClick={() => handleClearCache(s._id)}>🧹</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pagination page={page} pages={pagination.pages} onPage={setPage} />
        </div>
      )}
    </div>
  );
}
