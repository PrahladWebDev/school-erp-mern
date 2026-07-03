import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { fetchTeachers } from '../../store/slices/teacherSlice';
import { teacherAPI } from '../../api';
import { SearchInput, Pagination, PageLoader, EmptyState, Avatar, Modal } from '../../components/common';
import toast from 'react-hot-toast';

export default function TeachersPage() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { list: teachers, pagination, loading } = useSelector(s => s.teachers);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [credsModal, setCredsModal] = useState(null);
  const [resetting, setResetting] = useState(null);

  const handleResetCreds = async (teacher) => {
    setResetting(teacher._id);
    try {
      const { data } = await teacherAPI.resetCredentials(teacher._id);
      setCredsModal({ name: `${teacher.firstName} ${teacher.lastName || ''}`.trim(), ...data.data });
      toast.success('Credentials reset!');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to reset credentials');
    } finally { setResetting(null); }
  };

  useEffect(() => {
    const params = { page, limit:20 };
    if (search) params.search = search;
    dispatch(fetchTeachers(params));
  }, [dispatch, page, search]);

  const DESIG_COLORS = {
    principal:'#f5a623', vice_principal:'#0284c7', head_teacher:'#7c3aed',
    teacher:'#16a34a', assistant_teacher:'#6b7280'
  };

  return (
    <div>
      <div className="page-header">
        <div className="page-header-left">
          <h1>Teachers</h1>
          <p>{pagination?.total || 0} staff members</p>
        </div>
        <button className="btn btn-primary" onClick={() => navigate('/admin/teachers/add')}>+ Add Teacher</button>
      </div>

      <div className="card mb-5">
        <div className="filter-bar">
          <SearchInput value={search} onChange={setSearch} placeholder="Search by name, employee ID..." />
        </div>
      </div>

      {loading ? <PageLoader /> : teachers.length === 0 ? (
        <EmptyState icon="👩‍🏫" title="No teachers found"
          action={<button className="btn btn-primary" onClick={() => navigate('/admin/teachers/add')}>Add Teacher</button>} />
      ) : (
        <div className="card">
          <div className="table-wrapper">
            <table>
              <thead><tr><th>Teacher</th><th>Employee ID</th><th>Designation</th><th>Subjects</th><th>Mobile</th><th>Status</th><th>Actions</th></tr></thead>
              <tbody>
                {teachers.map(t => (
                  <tr key={t._id}>
                    <td>
                      <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                        <Avatar src={t.photo?.url} name={`${t.firstName} ${t.lastName||''}`} size="sm" color="#0284c7" />
                        <div>
                          <div style={{ fontWeight:500 }}>{t.firstName} {t.lastName}</div>
                          <div style={{ fontSize:'0.75rem', color:'var(--gray-400)' }}>{t.qualification}</div>
                        </div>
                      </div>
                    </td>
                    <td style={{ fontFamily:'monospace', fontSize:'0.875rem' }}>{t.employeeId}</td>
                    <td>
                      <span style={{
                        fontSize:'0.75rem', fontWeight:600, padding:'3px 8px',
                        borderRadius:999, textTransform:'capitalize',
                        background: (DESIG_COLORS[t.designation] || '#6b7280') + '20',
                        color: DESIG_COLORS[t.designation] || '#6b7280'
                      }}>
                        {t.designation?.replace('_',' ')}
                      </span>
                    </td>
                    <td style={{ fontSize:'0.8rem' }}>{(t.subjects || []).slice(0,2).join(', ')}{t.subjects?.length > 2 ? '...' : ''}</td>
                    <td>{t.mobile}</td>
                    <td><span className={`badge badge-${t.status==='active'?'success':'gray'}`}>{t.status}</span></td>
                    <td>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button className="btn btn-ghost btn-sm" title="Reset login password"
                          disabled={resetting === t._id}
                          onClick={() => handleResetCreds(t)}>
                          {resetting === t._id ? '⏳' : '🔑'}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pagination page={page} pages={pagination?.pages} onPage={setPage} />
        </div>
      )}

      {/* Reset Credentials Modal */}
      <Modal isOpen={!!credsModal} onClose={() => setCredsModal(null)} title="🔑 Teacher Login Credentials">
        {credsModal && (
          <div>
            <div style={{ marginBottom: 12, padding: 12, background: '#f0fdf4', borderRadius: 8, border: '1px solid #bbf7d0', fontSize: '0.875rem' }}>
              Credentials reset for <strong>{credsModal.name}</strong>
            </div>
            <div style={{ background: 'var(--gray-50)', borderRadius: 8, padding: 14, border: '1px solid var(--gray-200)' }}>
              <div style={{ fontSize: '0.875rem' }}>
                <div>📧 <strong>Email:</strong> <code style={{ background: '#fff', padding: '2px 8px', borderRadius: 4, border: '1px solid var(--gray-200)' }}>{credsModal.email}</code></div>
                <div style={{ marginTop: 6 }}>🔒 <strong>New Password:</strong> <code style={{ background: '#fff', padding: '2px 8px', borderRadius: 4, border: '1px solid var(--gray-200)', color: 'var(--primary)' }}>{credsModal.password}</code></div>
              </div>
            </div>
            <p style={{ fontSize: '0.8rem', color: 'var(--danger)', marginTop: 12 }}>⚠️ Save this password now. It won't be shown again.</p>
            <button className="btn btn-ghost w-full mt-2" onClick={() => {
              navigator.clipboard?.writeText(`Email: ${credsModal.email}\nPassword: ${credsModal.password}`);
              toast.success('Copied!');
            }}>📋 Copy</button>
          </div>
        )}
      </Modal>
    </div>
  );
}
