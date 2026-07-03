import React, { useEffect, useState } from 'react';
import { attendanceAPI, parentAPI } from '../../api';
import { Card, PageLoader, ProgressBar } from '../../components/common';
import toast from 'react-hot-toast';

const STATUS_BADGE = {
  present: 'badge-success',
  absent:  'badge-danger',
  late:    'badge-warning',
  leave:   'badge-info',
};

export default function ParentAttendancePage() {
  const [children, setChildren] = useState([]);
  const [selectedChild, setSelectedChild] = useState(null);
  const [records, setRecords] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [recordsLoading, setRecordsLoading] = useState(false);
  const [month, setMonth] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  });

  useEffect(() => {
    parentAPI.getChildren()
      .then(r => {
        const list = r.data.data.children || [];
        setChildren(list);
        if (list.length > 0) setSelectedChild(list[0]);
      })
      .catch(() => toast.error('Failed to load child info'))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!selectedChild?._id) return;
    setRecordsLoading(true);
    attendanceAPI.getStudentHistory(selectedChild._id, { month })
      .then(r => {
        // Backend returns { attendance: [{ date, status, remarks }], summary: {...} }
        setRecords(r.data.data.attendance || []);
        setSummary(r.data.data.summary || null);
      })
      .catch(() => toast.error('Failed to load attendance'))
      .finally(() => setRecordsLoading(false));
  }, [selectedChild, month]);

  const pct = summary?.percentage ?? 0;
  const sortedRecords = [...records].sort((a, b) => new Date(b.date) - new Date(a.date));

  if (loading) return <PageLoader />;

  return (
    <div>
      <div className="page-header">
        <div className="page-header-left">
          <h1>Child Attendance</h1>
          {children.length > 1 && (
            <select className="form-select" style={{ marginTop: 6, width: 200 }}
              value={selectedChild?._id || ''}
              onChange={e => setSelectedChild(children.find(c => c._id === e.target.value))}>
              {children.map(c => (
                <option key={c._id} value={c._id}>{c.firstName} {c.lastName}</option>
              ))}
            </select>
          )}
        </div>
        <input className="form-input" type="month" value={month}
          onChange={e => setMonth(e.target.value)} style={{ width: 180 }} />
      </div>

      {selectedChild && (
        <div className="card mb-4" style={{ padding: '10px 16px', display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'var(--primary)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700 }}>
            {selectedChild.firstName?.[0]}{selectedChild.lastName?.[0]}
          </div>
          <div>
            <div style={{ fontWeight: 600 }}>{selectedChild.firstName} {selectedChild.lastName}</div>
            <div style={{ fontSize: '0.78rem', color: 'var(--gray-400)' }}>
              {selectedChild.class?.name || ''} {selectedChild.section ? `· Section ${selectedChild.section}` : ''} · {selectedChild.admissionNumber}
            </div>
          </div>
        </div>
      )}

      {recordsLoading ? <PageLoader /> : (
        <>
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

          <Card title="Attendance Overview">
            <ProgressBar value={pct} />
            {pct < 75 && (
              <p style={{ color: 'var(--danger)', fontSize: '0.875rem', marginTop: 12 }}>
                ⚠️ Attendance is below 75%. Please ensure regular attendance.
              </p>
            )}
          </Card>

          <Card title="Day-wise Record" className="mt-4">
            {sortedRecords.length === 0
              ? <p style={{ color: 'var(--gray-400)', textAlign: 'center', padding: 24 }}>No records for this month</p>
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
        </>
      )}
    </div>
  );
}
