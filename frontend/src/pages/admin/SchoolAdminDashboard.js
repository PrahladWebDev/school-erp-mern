import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { dashboardAPI } from '../../api';
import { StatCard, Card, PageLoader, ProgressBar } from '../../components/common';
import toast from 'react-hot-toast';

export default function SchoolAdminDashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    dashboardAPI.getSchoolAdmin()
      .then(r => setData(r.data.data))
      .catch(() => toast.error('Failed to load dashboard'))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <PageLoader />;
  const { stats = {}, recentAdmissions = [], recentNotices = [] } = data || {};
  const { todayAttendance = {}, feeCollection = {} } = stats;

  return (
    <div>
      <div className="page-header">
        <div className="page-header-left">
          <h1>School Dashboard</h1>
          <p>Today's overview — {new Date().toLocaleDateString('en-IN', { weekday:'long', day:'2-digit', month:'long', year:'numeric' })}</p>
        </div>
        <button className="btn btn-primary" onClick={() => navigate('/admin/students/add')}>+ Admit Student</button>
      </div>

      <div className="grid-4 mb-5">
        <StatCard icon="👨‍🎓" label="Total Students"   value={stats.totalStudents}  color="#1e3a5f" bg="#e8f0fe" />
        <StatCard icon="👩‍🏫" label="Total Teachers"   value={stats.totalTeachers}  color="#0284c7" bg="#f0f9ff" />
        <StatCard icon="⏳"   label="Pending Leaves"  value={stats.pendingLeaves}  color="#d97706" bg="#fffbeb" />
        <StatCard icon="💰"   label="Pending Fees"    value={stats.pendingFees}    color="#dc2626" bg="#fef2f2" />
      </div>

      <div className="grid-3 mb-5">
        {/* Today's Attendance */}
        <Card title="Today's Attendance">
          <div style={{ textAlign:'center', marginBottom:16 }}>
            <div style={{ fontSize:'2.5rem', fontWeight:800, color:'var(--primary)' }}>
              {todayAttendance.attendancePercentage || 0}%
            </div>
            <div style={{ fontSize:'0.8rem', color:'var(--gray-400)' }}>Overall Attendance</div>
          </div>
          <ProgressBar value={todayAttendance.attendancePercentage || 0} />
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12, marginTop:16 }}>
            {[
              { label:'Present', value: todayAttendance.present || 0, color:'var(--success)' },
              { label:'Absent',  value: todayAttendance.absent  || 0, color:'var(--danger)'  },
            ].map(i => (
              <div key={i.label} style={{ textAlign:'center', padding:10, background:'var(--gray-50)', borderRadius:8 }}>
                <div style={{ fontSize:'1.4rem', fontWeight:700, color:i.color }}>{i.value}</div>
                <div style={{ fontSize:'0.75rem', color:'var(--gray-400)' }}>{i.label}</div>
              </div>
            ))}
          </div>
          <button className="btn btn-outline btn-sm w-full mt-4" onClick={() => navigate('/admin/attendance')}>Mark Attendance</button>
        </Card>

        {/* Fee Collection */}
        <Card title="Fee Collection">
          <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
            {[
              { label:'Total Fees',   value: feeCollection.total   || 0, color:'var(--gray-700)' },
              { label:'Collected',    value: feeCollection.collected|| 0, color:'var(--success)'  },
              { label:'Outstanding',  value: feeCollection.due     || 0, color:'var(--danger)'   },
            ].map(i => (
              <div key={i.label} style={{ display:'flex', justifyContent:'space-between', padding:'8px 0', borderBottom:'1px solid var(--gray-100)' }}>
                <span style={{ fontSize:'0.875rem', color:'var(--gray-500)' }}>{i.label}</span>
                <span style={{ fontWeight:600, color:i.color }}>
                  ₹{Number(i.value).toLocaleString('en-IN')}
                </span>
              </div>
            ))}
          </div>
          <button className="btn btn-outline btn-sm w-full mt-4" onClick={() => navigate('/admin/fees')}>Manage Fees</button>
        </Card>

        {/* Recent Notices */}
        <Card title="Recent Notices" action={
          <button className="btn btn-ghost btn-sm" onClick={() => navigate('/admin/notices')}>View All</button>
        }>
          {recentNotices.length === 0
            ? <p style={{ color:'var(--gray-400)', fontSize:'0.875rem' }}>No notices</p>
            : recentNotices.map(n => (
              <div key={n._id} style={{ padding:'8px 0', borderBottom:'1px solid var(--gray-100)' }}>
                <div style={{ fontWeight:500, fontSize:'0.875rem' }}>{n.title}</div>
                <div style={{ fontSize:'0.75rem', color:'var(--gray-400)', marginTop:2 }}>
                  {n.category} • {new Date(n.publishDate).toLocaleDateString('en-IN')}
                </div>
              </div>
            ))
          }
        </Card>
      </div>

      {/* Recent Admissions */}
      <Card title="Recent Admissions">
        <div className="table-wrapper">
          <table>
            <thead><tr>
              <th>Adm. No</th><th>Name</th><th>Class</th><th>Admitted On</th><th>Status</th>
            </tr></thead>
            <tbody>
              {recentAdmissions.length === 0
                ? <tr><td colSpan={5} style={{ textAlign:'center', color:'var(--gray-400)', padding:24 }}>No recent admissions</td></tr>
                : recentAdmissions.map(s => (
                  <tr key={s._id} style={{ cursor:'pointer' }} onClick={() => navigate(`/admin/students/${s._id}`)}>
                    <td style={{ fontWeight:500 }}>{s.admissionNumber}</td>
                    <td>{s.firstName} {s.lastName}</td>
                    <td>{s.class?.name}{s.section ? ` - ${s.section}` : ''}</td>
                    <td>{new Date(s.admissionDate || s.createdAt).toLocaleDateString('en-IN')}</td>
                    <td><span className={`badge badge-${s.status === 'active' ? 'success':'gray'}`}>{s.status}</span></td>
                  </tr>
                ))
              }
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
