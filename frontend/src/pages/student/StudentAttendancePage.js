import React, { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import { attendanceAPI } from '../../api';
import { Card, PageLoader, ProgressBar } from '../../components/common';
import toast from 'react-hot-toast';

const STATUS_COLOR = {
  present: '#16a34a',
  absent:  '#dc2626',
  late:    '#d97706',
  leave:   '#0284c7',
};

const STATUS_BADGE = {
  present: 'badge-success',
  absent:  'badge-danger',
  late:    'badge-warning',
  leave:   'badge-info',
};

export default function StudentAttendancePage() {
  const { user } = useSelector(s => s.auth);
  const [records, setRecords] = useState([]);   // [{ date, status, remarks }]
  const [summary, setSummary] = useState(null); // { present, absent, late, leave, total, percentage }
  const [loading, setLoading] = useState(true);
  const [month, setMonth] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  });

  useEffect(() => {
    if (!user?.profileId) { setLoading(false); return; }
    setLoading(true);
    attendanceAPI.getStudentHistory(user.profileId, { month })
      .then(r => {
        // Backend returns { attendance: [{ date, status, remarks }], summary: { present, absent, ... } }
        setRecords(r.data.data.attendance || []);
        setSummary(r.data.data.summary || null);
      })
      .catch(() => toast.error('Failed to load attendance'))
      .finally(() => setLoading(false));
  }, [user, month]);

  const pct = summary?.percentage ?? 0;
  const sortedRecords = [...records].sort((a, b) => new Date(b.date) - new Date(a.date));

  if (loading) return <PageLoader />;

  return (
    <div>
      <div className="page-header">
        <div className="page-header-left"><h1>My Attendance</h1></div>
        <input className="form-input" type="month" value={month}
          onChange={e => setMonth(e.target.value)} style={{ width: 180 }} />
      </div>

      <div className="grid-4 mb-5">
        <div className="stat-card">
          <div className="stat-icon" style={{ background: '#f0fdf4', color: '#16a34a' }}>✅</div>
          <div className="stat-info"><div className="stat-value">{summary?.present ?? 0}</div><div className="stat-label">Present</div></div>
        </div>
        <div className="stat-card">
          <div className="stat-icon" style={{ background: '#fef2f2', color: '#dc2626' }}>❌</div>
          <div className="stat-info"><div className="stat-value">{summary?.absent ?? 0}</div><div className="stat-label">Absent</div></div>
        </div>
        <div className="stat-card">
          <div className="stat-icon" style={{ background: '#fffbeb', color: '#d97706' }}>⏰</div>
          <div className="stat-info"><div className="stat-value">{summary?.late ?? 0}</div><div className="stat-label">Late</div></div>
        </div>
        <div className="stat-card">
          <div className="stat-icon" style={{ background: '#f5f3ff', color: '#7c3aed' }}>📊</div>
          <div className="stat-info"><div className="stat-value">{pct}%</div><div className="stat-label">Attendance %</div></div>
        </div>
      </div>

      <Card title="Monthly Overview">
        <ProgressBar value={pct} />
        {pct < 75 && (
          <p style={{ color: 'var(--danger)', fontSize: '0.875rem', marginTop: 12 }}>
            ⚠️ Your attendance is below 75%. Please attend regularly.
          </p>
        )}
        <div style={{ display: 'flex', gap: 16, marginTop: 16, flexWrap: 'wrap' }}>
          {[
            { label: 'Present', count: summary?.present ?? 0, color: '#16a34a' },
            { label: 'Absent',  count: summary?.absent  ?? 0, color: '#dc2626' },
            { label: 'Late',    count: summary?.late    ?? 0, color: '#d97706' },
            { label: 'Leave',   count: summary?.leave   ?? 0, color: '#0284c7' },
          ].map(item => (
            <div key={item.label} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <div style={{ width: 10, height: 10, borderRadius: '50%', background: item.color }} />
              <span style={{ fontSize: '0.85rem', color: 'var(--gray-600)' }}>
                <strong>{item.count}</strong> {item.label}
              </span>
            </div>
          ))}
        </div>
      </Card>

      <Card title="Day-wise Record" className="mt-4">
        {sortedRecords.length === 0
          ? <p style={{ color: 'var(--gray-400)', textAlign: 'center', padding: 24 }}>
              No attendance records for this month
            </p>
          : <div className="table-wrapper">
              <table>
                <thead>
                  <tr><th>Date</th><th>Day</th><th>Status</th></tr>
                </thead>
                <tbody>
                  {sortedRecords.map((r, i) => (
                    <tr key={i}>
                      <td>{new Date(r.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</td>
                      <td style={{ color: 'var(--gray-500)' }}>{new Date(r.date).toLocaleDateString('en-IN', { weekday: 'long' })}</td>
                      <td>
                        <span className={`badge ${STATUS_BADGE[r.status] || 'badge-gray'}`} style={{ textTransform: 'capitalize' }}>
                          {r.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
        }
      </Card>
    </div>
  );
}
