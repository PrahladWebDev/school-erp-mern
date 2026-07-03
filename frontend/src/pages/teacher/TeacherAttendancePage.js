import React, { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import { attendanceAPI, classAPI, studentAPI } from '../../api';
import { Card, PageLoader } from '../../components/common';
import toast from 'react-hot-toast';

const STATUS_OPTS = [
  { value: 'present', label: 'P',  color: '#16a34a', bg: '#f0fdf4' },
  { value: 'absent',  label: 'A',  color: '#dc2626', bg: '#fef2f2' },
  { value: 'late',    label: 'L',  color: '#d97706', bg: '#fffbeb' },
  { value: 'leave',   label: 'LE', color: '#0284c7', bg: '#f0f9ff' },
];

const ROLE_LABEL = {
  school_admin: 'Admin',
  teacher: 'Teacher',
  super_admin: 'Super Admin',
};

export default function TeacherAttendancePage() {
  const { school, user } = useSelector(s => s.auth);
  const [classes, setClasses] = useState([]);
  const [students, setStudents] = useState([]);
  const [records, setRecords] = useState({});
  const [markedInfo, setMarkedInfo] = useState(null);
  const [form, setForm] = useState({
    classId: '', section: '', date: new Date().toISOString().split('T')[0]
  });
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [alreadyMarked, setAlreadyMarked] = useState(false);

  useEffect(() => {
    classAPI.getAll({ academicYear: school?.currentAcademicYear })
      .then(r => setClasses(r.data.data.classes || []))
      .catch(() => toast.error('Failed to load classes'));
  }, [school]);

  const loadData = async () => {
    if (!form.classId || !form.date) return;
    setLoading(true);
    try {
      const [attRes, stuRes] = await Promise.all([
        attendanceAPI.get({ classId: form.classId, section: form.section, date: form.date }),
        studentAPI.getAll({
          classId: form.classId, section: form.section,
          status: 'active', limit: 200,
          academicYear: school?.currentAcademicYear
        })
      ]);
      const stuList = stuRes.data.data.students || [];
      setStudents(stuList);

      const existing = attRes.data.data.attendance?.[0];
      const init = {};
      if (existing?.records?.length) {
        setAlreadyMarked(true);
        setMarkedInfo({
          markedByName: existing.markedByName || null,
          markedByRole: existing.markedByRole || null,
          markedAt: existing.markedAt || null,
        });
        existing.records.forEach(r => {
          const sid = r.studentId?._id?.toString() || r.studentId?.toString();
          if (sid) init[sid] = r.status;
        });
        stuList.forEach(s => { if (!init[s._id]) init[s._id] = 'present'; });
      } else {
        setAlreadyMarked(false);
        setMarkedInfo(null);
        stuList.forEach(s => { init[s._id] = 'present'; });
      }
      setRecords(init);
    } catch {
      toast.error('Failed to load attendance data');
    } finally { setLoading(false); }
  };

  useEffect(() => { loadData(); }, [form.classId, form.section, form.date]);

  const handleMark = async () => {
    if (!form.classId) return toast.error('Select a class');
    if (students.length === 0) return toast.error('No students found');
    setSaving(true);
    try {
      await attendanceAPI.mark({
        classId: form.classId,
        section: form.section || undefined,
        date: form.date,
        academicYear: school?.currentAcademicYear,
        records: students.map(s => ({ studentId: s._id, status: records[s._id] || 'present' }))
      });
      toast.success(alreadyMarked ? 'Attendance updated!' : 'Attendance marked!');
      setAlreadyMarked(true);
      setMarkedInfo({
        markedByName: user?.name || 'Teacher',
        markedByRole: user?.role || 'teacher',
        markedAt: new Date().toISOString(),
      });
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to mark attendance');
    } finally { setSaving(false); }
  };

  const selectedClassDef = classes.find(c => c._id === form.classId);
  const counts = { present: 0, absent: 0, late: 0, leave: 0 };
  Object.values(records).forEach(s => { if (counts[s] !== undefined) counts[s]++; });

  return (
    <div>
      <div className="page-header">
        <div className="page-header-left"><h1>Mark Attendance</h1></div>
      </div>

      <Card title="Select Class & Date">
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16 }}>
          <div className="form-group">
            <label className="form-label">Class *</label>
            <select className="form-select" value={form.classId}
              onChange={e => setForm(f => ({ ...f, classId: e.target.value, section: '' }))}>
              <option value="">Select Class</option>
              {classes.map(c => <option key={c._id} value={c._id}>{c.name}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Section</label>
            <select className="form-select" value={form.section}
              onChange={e => setForm(f => ({ ...f, section: e.target.value }))}>
              <option value="">All Sections</option>
              {(selectedClassDef?.sections || []).map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Date *</label>
            <input className="form-input" type="date" value={form.date}
              max={new Date().toISOString().split('T')[0]}
              onChange={e => setForm(f => ({ ...f, date: e.target.value }))} />
          </div>
        </div>
      </Card>

      {loading ? <PageLoader message="Loading students..." /> : students.length > 0 ? (
        <Card title={`Students (${students.length})`}>
          {/* Already marked banner showing who did it */}
          {alreadyMarked && (
            <div style={{
              background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 8,
              padding: '10px 14px', marginBottom: 16, fontSize: '0.875rem', color: '#92400e',
              display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap'
            }}>
              <span>⚠️ Attendance already marked</span>
              {markedInfo?.markedByRole && (
                <span style={{
                  background: markedInfo.markedByRole === 'teacher' ? '#16a34a' : '#1e3a5f',
                  color: '#fff', borderRadius: 99, padding: '1px 8px', fontSize: '0.72rem', fontWeight: 600
                }}>
                  {ROLE_LABEL[markedInfo.markedByRole] || markedInfo.markedByRole}
                </span>
              )}
              {markedInfo?.markedByName && <span>{markedInfo.markedByName}</span>}
              {markedInfo?.markedAt && (
                <span style={{ fontSize: '0.78rem', color: '#b45309' }}>
                  · {new Date(markedInfo.markedAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                </span>
              )}
              <span>— You can update it below.</span>
            </div>
          )}

          {/* Summary bar */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 10, marginBottom: 16 }}>
            {STATUS_OPTS.map(o => (
              <div key={o.value} style={{ textAlign: 'center', padding: '8px', background: o.bg, borderRadius: 8 }}>
                <div style={{ fontSize: '1.3rem', fontWeight: 700, color: o.color }}>{counts[o.value]}</div>
                <div style={{ fontSize: '0.7rem', color: o.color, fontWeight: 600, textTransform: 'uppercase' }}>{o.value}</div>
              </div>
            ))}
          </div>

          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>#</th><th>Adm. No</th><th>Student</th><th>Sec</th>
                  {STATUS_OPTS.map(o => <th key={o.value} style={{ textAlign: 'center', minWidth: 44 }}>{o.label}</th>)}
                </tr>
              </thead>
              <tbody>
                {students.map((s, i) => {
                  const cur = records[s._id] || 'present';
                  const opt = STATUS_OPTS.find(o => o.value === cur);
                  return (
                    <tr key={s._id} style={{ background: opt?.bg + '55' }}>
                      <td style={{ color: 'var(--gray-400)', fontSize: '0.8rem' }}>{i + 1}</td>
                      <td style={{ fontWeight: 500, fontSize: '0.85rem' }}>{s.admissionNumber}</td>
                      <td>
                        <div style={{ fontWeight: 500 }}>{s.firstName} {s.lastName}</div>
                        {s.rollNumber && <div style={{ fontSize: '0.72rem', color: 'var(--gray-400)' }}>Roll: {s.rollNumber}</div>}
                      </td>
                      <td style={{ color: 'var(--gray-400)' }}>{s.section || '—'}</td>
                      {STATUS_OPTS.map(o => (
                        <td key={o.value} style={{ textAlign: 'center' }}>
                          <button
                            onClick={() => setRecords(r => ({ ...r, [s._id]: o.value }))}
                            title={o.value}
                            style={{
                              width: 36, height: 36, borderRadius: 8, border: '2px solid',
                              borderColor: cur === o.value ? o.color : 'transparent',
                              background: cur === o.value ? o.bg : 'var(--gray-100)',
                              color: cur === o.value ? o.color : 'var(--gray-400)',
                              fontWeight: 700, fontSize: '0.75rem', cursor: 'pointer'
                            }}
                          >{o.label}</button>
                        </td>
                      ))}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, marginTop: 16 }}>
            <button className="btn btn-primary" onClick={handleMark} disabled={saving}>
              {saving ? 'Saving...' : alreadyMarked ? '✓ Update Attendance' : '✓ Submit Attendance'}
            </button>
          </div>
        </Card>
      ) : form.classId ? (
        <div className="card" style={{ textAlign: 'center', padding: 40, color: 'var(--gray-400)' }}>
          No students found for selected class/section
        </div>
      ) : null}
    </div>
  );
}
