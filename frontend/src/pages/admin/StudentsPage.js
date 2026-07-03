import React, { useEffect, useState, useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { fetchStudents } from '../../store/slices/studentSlice';
import { fetchClasses } from '../../store/slices/classSlice';
import { studentAPI } from '../../api';
import { SearchInput, Pagination, PageLoader, EmptyState, Avatar, ConfirmDialog, Modal } from '../../components/common';
import toast from 'react-hot-toast';

export default function StudentsPage() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { list: students, pagination, loading } = useSelector(s => s.students);
  const { list: classes } = useSelector(s => s.classes);
  const { school } = useSelector(s => s.auth);

  const [filters, setFilters] = useState({ search:'', classId:'', section:'', status:'active', gender:'', page:1, limit:20 });
  const [deleteId, setDeleteId] = useState(null);
  const [statsModal, setStatsModal] = useState(false);
  const [stats, setStats] = useState(null);
  const [statsLoading, setStatsLoading] = useState(false);

  const load = useCallback(() => {
    const params = {};
    Object.entries(filters).forEach(([k,v]) => { if (v) params[k] = v; });
    dispatch(fetchStudents(params));
  }, [dispatch, filters]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { dispatch(fetchClasses({})); }, [dispatch]);

  const handleDelete = async () => {
    try {
      await studentAPI.delete(deleteId);
      toast.success('Student deactivated');
      setDeleteId(null);
      load();
    } catch { toast.error('Failed to deactivate student'); }
  };

  const openStats = async () => {
    setStatsModal(true);
    setStatsLoading(true);
    try {
      const { data } = await studentAPI.getStats({ academicYear: school?.currentAcademicYear });
      setStats(data.data);
    } catch { toast.error('Failed to load stats'); }
    finally { setStatsLoading(false); }
  };

  const setFilter = (key, val) => setFilters(f => ({ ...f, [key]: val, page: 1 }));

  return (
    <div>
      <div className="page-header">
        <div className="page-header-left">
          <h1>Students</h1>
          <p>{pagination?.total || 0} students registered</p>
        </div>
        <div className="page-header-actions">
          <button className="btn btn-outline" onClick={openStats}>📊 Stats</button>
          <button className="btn btn-outline" onClick={() => navigate('/admin/students/promote')}>🎓 Promote Students</button>
          <button className="btn btn-primary" onClick={() => navigate('/admin/students/add')}>+ Admit Student</button>
        </div>
      </div>

      {/* Filters */}
      <div className="card mb-5">
        <div className="filter-bar">
          <SearchInput value={filters.search} onChange={v => setFilter('search', v)} placeholder="Search by name, admission no..." />
          <select className="form-select" style={{ width:160 }} value={filters.classId} onChange={e => setFilter('classId', e.target.value)}>
            <option value="">All Classes</option>
            {classes.map(c => <option key={c._id} value={c._id}>{c.name}</option>)}
          </select>
          <select className="form-select" style={{ width:120 }} value={filters.section} onChange={e => setFilter('section', e.target.value)}>
            <option value="">All Sections</option>
            {['A','B','C','D'].map(s => <option key={s} value={s}>Section {s}</option>)}
          </select>
          <select className="form-select" style={{ width:130 }} value={filters.status} onChange={e => setFilter('status', e.target.value)}>
            <option value="">All Status</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
            <option value="transferred">Transferred</option>
          </select>
          <select className="form-select" style={{ width:120 }} value={filters.gender} onChange={e => setFilter('gender', e.target.value)}>
            <option value="">All Gender</option>
            <option value="male">Male</option>
            <option value="female">Female</option>
          </select>
          <button className="btn btn-ghost btn-sm" onClick={() => setFilters({ search:'', classId:'', section:'', status:'active', gender:'', page:1, limit:20 })}>
            Reset
          </button>
        </div>
      </div>

      {/* Table */}
      {loading ? <PageLoader /> : (
        <div className="card">
          {students.length === 0 ? (
            <EmptyState icon="👨‍🎓" title="No students found" description="Try adjusting your filters or admit a new student."
              action={<button className="btn btn-primary" onClick={() => navigate('/admin/students/add')}>Admit Student</button>} />
          ) : (
            <>
              <div className="table-wrapper">
                <table>
                  <thead><tr>
                    <th>Student</th><th>Adm. No</th><th>Class</th><th>Gender</th>
                    <th>Parent Mobile</th><th>Status</th><th>Actions</th>
                  </tr></thead>
                  <tbody>
                    {students.map(s => (
                      <tr key={s._id}>
                        <td>
                          <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                            <Avatar src={s.photo?.url} name={`${s.firstName} ${s.lastName||''}`} size="sm" />
                            <div>
                              <div style={{ fontWeight:500 }}>{s.firstName} {s.lastName}</div>
                              <div style={{ fontSize:'0.75rem', color:'var(--gray-400)' }}>Roll: {s.rollNumber || '—'}</div>
                            </div>
                          </div>
                        </td>
                        <td style={{ fontFamily:'monospace', fontSize:'0.875rem' }}>{s.admissionNumber}</td>
                        <td>{s.class?.name}{s.section ? ` / ${s.section}` : ''}</td>
                        <td style={{ textTransform:'capitalize' }}>{s.gender}</td>
                        <td>{s.guardians?.[0]?.mobile || '—'}</td>
                        <td><span className={`badge badge-${s.status==='active'?'success':s.status==='transferred'?'info':'gray'}`}>{s.status}</span></td>
                        <td>
                          <div style={{ display:'flex', gap:6 }}>
                            <button className="btn btn-ghost btn-sm" onClick={() => navigate(`/admin/students/${s._id}`)}>View</button>
                            <button className="btn btn-ghost btn-sm" style={{ color:'var(--danger)' }} onClick={() => setDeleteId(s._id)}>Remove</button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <Pagination page={filters.page} pages={pagination?.pages} onPage={p => setFilters(f => ({ ...f, page:p }))} />
            </>
          )}
        </div>
      )}

      <ConfirmDialog
        isOpen={!!deleteId} onClose={() => setDeleteId(null)} onConfirm={handleDelete}
        title="Deactivate Student" message="Are you sure you want to deactivate this student? This can be reversed later."
        confirmLabel="Deactivate" danger
      />

      {/* Stats Modal */}
      <Modal isOpen={statsModal} onClose={() => setStatsModal(false)} title="📊 Student Statistics">
        {statsLoading ? <PageLoader /> : stats ? (
          <div>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:12, marginBottom:20 }}>
              <div style={{ background:'var(--primary-50,#eff6ff)', borderRadius:10, padding:'14px 16px', textAlign:'center' }}>
                <div style={{ fontSize:'1.8rem', fontWeight:700, color:'var(--primary)' }}>{stats.total}</div>
                <div style={{ fontSize:'0.75rem', color:'var(--gray-500)' }}>Total Students</div>
              </div>
              <div style={{ background:'#f0fdf4', borderRadius:10, padding:'14px 16px', textAlign:'center' }}>
                <div style={{ fontSize:'1.8rem', fontWeight:700, color:'var(--success)' }}>{stats.active}</div>
                <div style={{ fontSize:'0.75rem', color:'var(--gray-500)' }}>Active</div>
              </div>
              <div style={{ background:'#fef2f2', borderRadius:10, padding:'14px 16px', textAlign:'center' }}>
                <div style={{ fontSize:'1.8rem', fontWeight:700, color:'var(--danger)' }}>{stats.inactive}</div>
                <div style={{ fontSize:'0.75rem', color:'var(--gray-500)' }}>Inactive</div>
              </div>
            </div>

            {stats.genderDist?.length > 0 && (
              <div style={{ marginBottom:20 }}>
                <div style={{ fontWeight:600, fontSize:'0.875rem', marginBottom:8 }}>Gender Distribution</div>
                <div style={{ display:'flex', gap:12 }}>
                  {stats.genderDist.map(g => (
                    <div key={g._id} style={{ flex:1, background:'var(--gray-50,#f9fafb)', borderRadius:8, padding:'10px 14px', textAlign:'center' }}>
                      <div style={{ fontWeight:600, textTransform:'capitalize' }}>{g._id || 'Unknown'}</div>
                      <div style={{ fontSize:'1.4rem', fontWeight:700 }}>{g.count}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {stats.classDist?.length > 0 && (
              <div>
                <div style={{ fontWeight:600, fontSize:'0.875rem', marginBottom:8 }}>Students per Class</div>
                <div className="table-wrapper">
                  <table>
                    <thead><tr><th>Class</th><th>Count</th></tr></thead>
                    <tbody>
                      {stats.classDist.map(c => (
                        <tr key={c._id}>
                          <td>{c._id}</td>
                          <td><strong>{c.count}</strong></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        ) : <div style={{ textAlign:'center', color:'var(--gray-400)', padding:24 }}>No stats available</div>}
      </Modal>
    </div>
  );
}
