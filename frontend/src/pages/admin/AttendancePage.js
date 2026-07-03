import React, { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import { attendanceAPI, classAPI, studentAPI } from '../../api';
import { PageLoader, Card } from '../../components/common';
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

export default function AttendancePage() {
  const { school, user } = useSelector(s => s.auth);
  const [classes, setClasses] = useState([]);
  const [students, setStudents] = useState([]);
  const [records, setRecords] = useState({});
  const [markedInfo, setMarkedInfo] = useState(null); // { markedByName, markedByRole, markedAt }
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

  const loadAttendance = async () => {
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
      if (existing?.records?.length > 0) {
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
        stuList.forEach(s => { if (!init[s._id]) init[s._id] = 'absent'; });
      } else {
        setAlreadyMarked(false);
        setMarkedInfo(null);
        stuList.forEach(s => { init[s._id] = 'present'; });
      }
      setRecords(init);
    } catch {
      toast.error('Failed to load attendance data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { if (form.classId) loadAttendance(); }, [form.classId, form.section, form.date]);

  const markAll = (status) => {
    const all = {};
    students.forEach(s => { all[s._id] = status; });
    setRecords(all);
  };

  const handleSubmit = async () => {
    if (!form.classId || students.length === 0) return toast.error('Select a class first');
    setSaving(true);
    try {
      await attendanceAPI.mark({
        classId: form.classId,
        section: form.section || undefined,
        date: form.date,
        academicYear: school?.currentAcademicYear,
        records: students.map(s => ({ studentId: s._id, status: records[s._id] || 'absent' }))
      });
      toast.success(alreadyMarked ? 'Attendance updated!' : 'Attendance saved!');
      setAlreadyMarked(true);
      setMarkedInfo({
        markedByName: user?.name || 'Admin',
        markedByRole: user?.role || 'school_admin',
        markedAt: new Date().toISOString(),
      });
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save attendance');
    } finally {
      setSaving(false);
    }
  };

  const counts = { present: 0, absent: 0, late: 0, leave: 0 };
  Object.values(records).forEach(s => { if (counts[s] !== undefined) counts[s]++; });

  const selectedClassDef = classes.find(c => c._id === form.classId);

  return (
    <div>
      <div className="page-header">
        <div className="page-header-left">
          <h1>Mark Attendance</h1>
          <p style={{ color: 'var(--gray-400)', fontSize: '0.875rem' }}>Daily student attendance management</p>
        </div>
      </div>

      <Card className="mb-5">
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
              {(selectedClassDef?.sections || []).map(s =>
                <option key={s} value={s}>Section {s}</option>
              )}
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

      {loading ? <PageLoader /> : students.length === 0 ? (
        <Card>
          <div style={{ textAlign: 'center', padding: 40, color: 'var(--gray-400)' }}>
            <div style={{ fontSize: '3rem', marginBottom: 12 }}>👨‍🎓</div>
            <p>Select a class to load students and mark attendance</p>
          </div>
        </Card>
      ) : (
        <Card
          title={`${students.length} Students — ${new Date(form.date).toLocaleDateString('en-IN', { weekday: 'long', day: '2-digit', month: 'long' })}`}
          action={
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <button className="btn btn-ghost btn-sm" onClick={() => markAll('present')}>✓ All Present</button>
              <button className="btn btn-ghost btn-sm" onClick={() => markAll('absent')}>✗ All Absent</button>
              <button className={`btn btn-sm ${alreadyMarked ? 'btn-outline' : 'btn-primary'}`}
                onClick={handleSubmit} disabled={saving}>
                {saving ? 'Saving...' : alreadyMarked ? 'Update Attendance' : 'Save Attendance'}
              </button>
            </div>
          }
        >
          {/* Who marked banner */}
          {alreadyMarked && markedInfo && (
            <div style={{
              background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 8,
              padding: '10px 14px', marginBottom: 16, fontSize: '0.875rem', color: '#92400e',
              display: 'flex', alignItems: 'center', gap: 8
            }}>
              <span>⚠️ Already marked</span>
              {markedInfo.markedByRole && (
                <span style={{
                  background: markedInfo.markedByRole === 'teacher' ? '#16a34a' : '#1e3a5f',
                  color: '#fff', borderRadius: 99, padding: '1px 8px', fontSize: '0.72rem', fontWeight: 600
                }}>
                  {ROLE_LABEL[markedInfo.markedByRole] || markedInfo.markedByRole}
                </span>
              )}
              {markedInfo.markedByName && (
                <span style={{ color: '#92400e' }}>{markedInfo.markedByName}</span>
              )}
              {markedInfo.markedAt && (
                <span style={{ color: '#b45309', fontSize: '0.78rem' }}>
                  · {new Date(markedInfo.markedAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                </span>
              )}
              <span style={{ marginLeft: 4 }}>You can update below.</span>
            </div>
          )}

          {/* Summary */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12, marginBottom: 20 }}>
            {STATUS_OPTS.map(s => (
              <div key={s.value} style={{ textAlign: 'center', padding: '10px 8px', background: s.bg, borderRadius: 8 }}>
                <div style={{ fontSize: '1.4rem', fontWeight: 700, color: s.color }}>{counts[s.value]}</div>
                <div style={{ fontSize: '0.72rem', color: s.color, fontWeight: 600, textTransform: 'uppercase' }}>{s.value}</div>
              </div>
            ))}
          </div>

          {/* Student rows */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {students.map((s, idx) => {
              const cur = records[s._id] || 'present';
              const opt = STATUS_OPTS.find(o => o.value === cur);
              return (
                <div key={s._id} style={{
                  display: 'flex', alignItems: 'center', gap: 12,
                  padding: '10px 12px', borderRadius: 8,
                  background: opt?.bg || '#f9fafb',
                  border: `1px solid ${opt?.color || 'var(--gray-200)'}33`,
                  transition: 'background 0.15s',
                }}>
                  <span style={{ color: 'var(--gray-400)', fontSize: '0.8rem', width: 24, textAlign: 'center', flexShrink: 0 }}>{idx + 1}</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 500, fontSize: '0.9rem' }}>{s.firstName} {s.lastName || ''}</div>
                    <div style={{ fontSize: '0.73rem', color: 'var(--gray-400)' }}>
                      Roll: {s.rollNumber || '—'} &nbsp;|&nbsp; {s.admissionNumber}
                      {s.section && <span> &nbsp;|&nbsp; Sec {s.section}</span>}
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                    {STATUS_OPTS.map(opt => (
                      <button key={opt.value}
                        onClick={() => setRecords(r => ({ ...r, [s._id]: opt.value }))}
                        title={opt.value}
                        style={{
                          width: 36, height: 36, borderRadius: 8, border: '2px solid',
                          borderColor: cur === opt.value ? opt.color : 'transparent',
                          background: cur === opt.value ? opt.bg : 'var(--gray-100)',
                          color: cur === opt.value ? opt.color : 'var(--gray-400)',
                          fontWeight: 700, fontSize: '0.75rem', cursor: 'pointer',
                          transition: 'all 0.15s',
                        }}
                      >{opt.label}</button>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>

          <div style={{ marginTop: 20, display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
            <button className="btn btn-ghost"
              onClick={() => { setStudents([]); setRecords({}); setForm(f => ({ ...f, classId: '' })); }}>
              Clear
            </button>
            <button className="btn btn-primary" onClick={handleSubmit} disabled={saving}>
              {saving ? 'Saving...' : alreadyMarked ? '✓ Update Attendance' : '✓ Save Attendance'}
            </button>
          </div>
        </Card>
      )}
    </div>
  );
}
