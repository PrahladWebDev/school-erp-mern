import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { dashboardAPI } from '../../api';
import { Card, StatCard, PageLoader } from '../../components/common';
import toast from 'react-hot-toast';

export default function StudentDashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    dashboardAPI.getStudent()
      .then(r => setData(r.data.data))
      .catch(() => toast.error('Failed to load dashboard'))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <PageLoader message="Loading dashboard..." />;
  const { pendingFees = 0, pendingFeeAmount = 0, homeworks = [], results = [], notices = [] } = data || {};

  return (
    <div>
      <div className="page-header">
        <div className="page-header-left">
          <h1>Student Dashboard</h1>
          <p>{new Date().toLocaleDateString('en-IN', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' })}</p>
        </div>
      </div>

      <div className="grid-4 mb-5">
        <StatCard icon="💰" label="Pending Fee" value={`₹${Number(pendingFeeAmount).toLocaleString('en-IN')}`} color="#dc2626" bg="#fef2f2" />
        <StatCard icon="📚" label="Active Homework" value={homeworks.length} color="#1e3a5f" bg="#e8f0fe" />
        <StatCard icon="📝" label="Recent Results" value={results.length} color="#16a34a" bg="#f0fdf4" />
        <StatCard icon="📢" label="Notices" value={notices.length} color="#7c3aed" bg="#f5f3ff" />
      </div>

      <div className="grid-2">
        <Card title="Upcoming Homework" action={<button className="btn btn-ghost btn-sm" onClick={() => navigate('/student/homework')}>View All</button>}>
          {homeworks.length === 0
            ? <p style={{ color: 'var(--gray-400)', fontSize: '0.875rem' }}>No pending homework 🎉</p>
            : homeworks.slice(0, 5).map(hw => (
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

      {pendingFees > 0 && (
        <Card title="Fee Alert" className="mt-4">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <p style={{ color: 'var(--danger)', fontWeight: 600 }}>You have {pendingFees} pending fee payment(s).</p>
              <p style={{ fontSize: '0.875rem', color: 'var(--gray-500)' }}>Total due: ₹{Number(pendingFeeAmount).toLocaleString('en-IN')}</p>
            </div>
            <button className="btn btn-danger" onClick={() => navigate('/student/fees')}>View Fees</button>
          </div>
        </Card>
      )}
    </div>
  );
}
