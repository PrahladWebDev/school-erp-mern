import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { dashboardAPI } from '../../api';
import { Card, StatCard, PageLoader } from '../../components/common';
import toast from 'react-hot-toast';

export default function TeacherDashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    dashboardAPI.getTeacher()
      .then(r => setData(r.data.data))
      .catch(() => toast.error('Failed to load dashboard'))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <PageLoader message="Loading dashboard..." />;
  const { homeworks = [], notices = [], pendingLeaves = 0, todayMarked = 0 } = data || {};

  return (
    <div>
      <div className="page-header">
        <div className="page-header-left">
          <h1>Teacher Dashboard</h1>
          <p>{new Date().toLocaleDateString('en-IN', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' })}</p>
        </div>
        <button className="btn btn-primary" onClick={() => navigate('/teacher/attendance')}>Mark Attendance</button>
      </div>

      <div className="grid-4 mb-5">
        <StatCard icon="📚" label="Active Homework" value={homeworks.length} color="#1e3a5f" bg="#e8f0fe" />
        <StatCard icon="⏳" label="Pending Leaves" value={pendingLeaves} color="#d97706" bg="#fffbeb" />
        <StatCard icon="✅" label="Attendance Marked Today" value={todayMarked} color="#16a34a" bg="#f0fdf4" />
        <StatCard icon="📢" label="Notices" value={notices.length} color="#7c3aed" bg="#f5f3ff" />
      </div>

      <div className="grid-2">
        <Card title="Pending Homework" action={
          <button className="btn btn-ghost btn-sm" onClick={() => navigate('/teacher/homework')}>View All</button>
        }>
          {homeworks.length === 0
            ? <p style={{ color: 'var(--gray-400)', fontSize: '0.875rem' }}>No active homework</p>
            : homeworks.map(hw => (
              <div key={hw._id} style={{ padding: '8px 0', borderBottom: '1px solid var(--gray-100)' }}>
                <div style={{ fontWeight: 500, fontSize: '0.875rem' }}>{hw.subject} — {hw.title}</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--gray-400)', marginTop: 2 }}>
                  Due: {new Date(hw.dueDate).toLocaleDateString('en-IN')}
                </div>
              </div>
            ))
          }
        </Card>

        <Card title="Recent Notices">
          {notices.length === 0
            ? <p style={{ color: 'var(--gray-400)', fontSize: '0.875rem' }}>No notices</p>
            : notices.map(n => (
              <div key={n._id} style={{ padding: '8px 0', borderBottom: '1px solid var(--gray-100)' }}>
                <div style={{ fontWeight: 500, fontSize: '0.875rem' }}>{n.title}</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--gray-400)', marginTop: 2 }}>
                  {new Date(n.publishDate).toLocaleDateString('en-IN')}
                </div>
              </div>
            ))
          }
        </Card>
      </div>
    </div>
  );
}
