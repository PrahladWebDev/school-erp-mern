import React, { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import { attendanceAPI, classAPI } from '../../api';
import { Card, PageLoader, ProgressBar } from '../../components/common';
import toast from 'react-hot-toast';

export default function AttendanceReportPage() {
  const { school } = useSelector(s => s.auth);
  const [classes, setClasses] = useState([]);
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(false);
  const [classesLoading, setClassesLoading] = useState(true);
  const [form, setForm] = useState({
    classId: '', section: '',
    month: (() => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`; })()
  });

  useEffect(() => {
    classAPI.getAll({ academicYear: school?.currentAcademicYear })
      .then(r => setClasses(r.data.data.classes || []))
      .finally(() => setClassesLoading(false));
  }, [school]);

  const loadReport = async () => {
    if (!form.classId || !form.month) return toast.error('Select class and month');
    setLoading(true);
    try {
      const { data } = await attendanceAPI.getMonthlyReport({
        classId: form.classId,
        section: form.section || undefined,
        month: form.month
      });
      // Backend returns data.report (array of { student, present, absent, late, leave, percentage })
      const raw = data.data.report || [];
      setReport({
        workingDays: data.data.workingDays || 0,
        avgAttendance: raw.length > 0 ? Math.round(raw.reduce((s, r) => s + r.percentage, 0) / raw.length) : 0,
        students: raw.map(r => ({
          studentId: r.student?._id,
          admissionNumber: r.student?.admissionNumber,
          name: `${r.student?.firstName} ${r.student?.lastName || ''}`.trim(),
          present: r.present + (r.late || 0),
          absent: r.absent,
          percentage: r.percentage
        }))
      });
    } catch { toast.error('Failed to load report'); }
    finally { setLoading(false); }
  };

  const classDef = classes.find(c => c._id === form.classId);
  const studentRows = report?.students || [];
  const workingDays = report?.workingDays || 0;

  return (
    <div>
      <div className="page-header">
        <div className="page-header-left"><h1>Attendance Report</h1></div>
      </div>

      <Card title="Filter">
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr auto', gap: 16, alignItems: 'flex-end' }}>
          <div className="form-group">
            <label className="form-label">Class *</label>
            <select className="form-select" value={form.classId} onChange={e => setForm(f => ({ ...f, classId: e.target.value, section: '' }))}>
              <option value="">Select Class</option>
              {classes.map(c => <option key={c._id} value={c._id}>{c.name}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Section</label>
            <select className="form-select" value={form.section} onChange={e => setForm(f => ({ ...f, section: e.target.value }))}>
              <option value="">All Sections</option>
              {(classDef?.sections || []).map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Month *</label>
            <input className="form-input" type="month" value={form.month} onChange={e => setForm(f => ({ ...f, month: e.target.value }))} />
          </div>
          <button className="btn btn-primary" onClick={loadReport} disabled={loading}>
            {loading ? 'Loading...' : 'Generate'}
          </button>
        </div>
      </Card>

      {loading ? <PageLoader /> : report ? (
        <>
          <div className="grid-4 mb-5 mt-4">
            <div className="stat-card"><div className="stat-icon" style={{ background:'#e8f0fe',color:'#1e3a5f' }}>📅</div><div className="stat-info"><div className="stat-value">{workingDays}</div><div className="stat-label">Working Days</div></div></div>
            <div className="stat-card"><div className="stat-icon" style={{ background:'#f0fdf4',color:'#16a34a' }}>👨‍🎓</div><div className="stat-info"><div className="stat-value">{studentRows.length}</div><div className="stat-label">Students</div></div></div>
            <div className="stat-card"><div className="stat-icon" style={{ background:'#f0fdf4',color:'#16a34a' }}>✅</div><div className="stat-info"><div className="stat-value">{report.avgAttendance || 0}%</div><div className="stat-label">Avg Attendance</div></div></div>
            <div className="stat-card"><div className="stat-icon" style={{ background:'#fef2f2',color:'#dc2626' }}>⚠️</div><div className="stat-info"><div className="stat-value">{studentRows.filter(s => s.percentage < 75).length}</div><div className="stat-label">Below 75%</div></div></div>
          </div>

          <Card title="Student-wise Report">
            <div className="table-wrapper">
              <table>
                <thead>
                  <tr><th>#</th><th>Adm. No</th><th>Name</th><th>Present</th><th>Absent</th><th>Total</th><th>Attendance %</th></tr>
                </thead>
                <tbody>
                  {studentRows.map((s, i) => (
                    <tr key={s.studentId}>
                      <td style={{ color: 'var(--gray-400)' }}>{i + 1}</td>
                      <td>{s.admissionNumber}</td>
                      <td style={{ fontWeight: 500 }}>{s.name}</td>
                      <td style={{ color: 'var(--success)', fontWeight: 500 }}>{s.present}</td>
                      <td style={{ color: 'var(--danger)', fontWeight: 500 }}>{s.absent}</td>
                      <td>{s.present + s.absent}</td>
                      <td style={{ minWidth: 140 }}>
                        <ProgressBar value={s.percentage || 0} />
                        {s.percentage < 75 && <span style={{ fontSize: '0.7rem', color: 'var(--danger)' }}>⚠️ Below 75%</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </>
      ) : (
        <div className="card mt-4" style={{ textAlign: 'center', padding: 40, color: 'var(--gray-400)' }}>
          Select a class and month, then click Generate to view the report.
        </div>
      )}
    </div>
  );
}
