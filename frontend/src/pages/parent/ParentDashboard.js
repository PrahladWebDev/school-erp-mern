import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { feesAPI, homeworkAPI, noticeAPI, parentAPI } from '../../api';
import { Card, StatCard, PageLoader } from '../../components/common';
import toast from 'react-hot-toast';

export default function ParentDashboard() {
  const [data, setData] = useState({ fees: [], homeworks: [], notices: [] });
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const load = async () => {
      try {
        const childrenRes = await parentAPI.getChildren();
        const children = childrenRes.data.data.children || [];
        const studentId = children.length > 0 ? children[0]._id : null;

        const [feesRes, hwRes, noticeRes] = await Promise.all([
          studentId ? feesAPI.getStudentFees(studentId) : Promise.resolve({ data: { data: { fees: [] } } }),
          homeworkAPI.getAll({ limit: 5 }),
          noticeAPI.getAll({ limit: 5 })
        ]);
        setData({
          fees: feesRes.data.data.fees || [],
          homeworks: hwRes.data.data.homeworks || [],
          notices: noticeRes.data.data.notices || []
        });
      } catch {
        toast.error('Failed to load data');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  if (loading) return <PageLoader />;
  const pendingFees = data.fees.filter(f => f.status !== 'paid');
  const totalDue = pendingFees.reduce((s, f) => s + (f.dueAmount || 0), 0);

  return (
    <div>
      <div className="page-header">
        <div className="page-header-left">
          <h1>Parent Dashboard</h1>
          <p>{new Date().toLocaleDateString('en-IN', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' })}</p>
        </div>
      </div>

      <div className="grid-4 mb-5">
        <StatCard icon="💰" label="Fee Due" value={`₹${totalDue.toLocaleString('en-IN')}`} color="#dc2626" bg="#fef2f2" />
        <StatCard icon="📚" label="Active Homework" value={data.homeworks.length} color="#1e3a5f" bg="#e8f0fe" />
        <StatCard icon="📢" label="Notices" value={data.notices.length} color="#7c3aed" bg="#f5f3ff" />
        <StatCard icon="📋" label="Pending Fees" value={pendingFees.length} color="#d97706" bg="#fffbeb" />
      </div>

      <div className="grid-2">
        <Card title="Recent Homework" action={<button className="btn btn-ghost btn-sm" onClick={() => navigate('/parent/homework')}>View All</button>}>
          {data.homeworks.length === 0
            ? <p style={{ color: 'var(--gray-400)', fontSize: '0.875rem' }}>No active homework</p>
            : data.homeworks.map(hw => (
              <div key={hw._id} style={{ padding: '8px 0', borderBottom: '1px solid var(--gray-100)' }}>
                <div style={{ fontWeight: 500, fontSize: '0.875rem' }}>{hw.subject} — {hw.title}</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--gray-400)', marginTop: 2 }}>Due: {new Date(hw.dueDate).toLocaleDateString('en-IN')}</div>
              </div>
            ))
          }
        </Card>

        <Card title="Notices" action={<button className="btn btn-ghost btn-sm" onClick={() => navigate('/parent/notices')}>View All</button>}>
          {data.notices.length === 0
            ? <p style={{ color: 'var(--gray-400)', fontSize: '0.875rem' }}>No notices</p>
            : data.notices.map(n => (
              <div key={n._id} style={{ padding: '8px 0', borderBottom: '1px solid var(--gray-100)' }}>
                <div style={{ fontWeight: 500, fontSize: '0.875rem' }}>{n.title}</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--gray-400)', marginTop: 2 }}>{new Date(n.publishDate).toLocaleDateString('en-IN')}</div>
              </div>
            ))
          }
        </Card>
      </div>
    </div>
  );
}
