import React, { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import { timetableAPI, classAPI } from '../../api';
import { Card, PageLoader } from '../../components/common';
import toast from 'react-hot-toast';

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export default function TeacherTimetablePage() {
  const { school } = useSelector(s => s.auth);
  const [classes, setClasses] = useState([]);
  const [selectedClass, setSelectedClass] = useState('');
  const [selectedSection, setSelectedSection] = useState('');
  const [timetable, setTimetable] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    classAPI.getAll({ academicYear: school?.currentAcademicYear })
      .then(r => setClasses(r.data.data.classes || []))
      .catch(() => toast.error('Failed to load classes'));
  }, [school]);

  useEffect(() => {
    if (!selectedClass) return;
    setLoading(true);
    const params = { classId: selectedClass };
    if (selectedSection) params.section = selectedSection;
    if (school?.currentAcademicYear) params.academicYear = school.currentAcademicYear;
    timetableAPI.get(params)
      .then(r => setTimetable(r.data.data.timetable))
      .catch(() => setTimetable(null))
      .finally(() => setLoading(false));
  }, [selectedClass, selectedSection, school]);

  const classDef = classes.find(c => c._id === selectedClass);
  const schedule = timetable?.schedule || [];
  const byDay = {};
  DAYS.forEach(d => {
    const dayObj = schedule.find(s => s.day === d);
    byDay[d] = (dayObj?.periods || []).slice().sort((a, b) => a.startTime?.localeCompare(b.startTime));
  });
  const hasAny = schedule.some(d => d.periods?.length > 0);

  return (
    <div>
      <div className="page-header">
        <div className="page-header-left"><h1>Class Timetable</h1></div>
      </div>

      <Card title="Select Class">
        <div style={{ display: 'flex', gap: 16 }}>
          <div className="form-group" style={{ flex: 1 }}>
            <label className="form-label">Class</label>
            <select className="form-select" value={selectedClass}
              onChange={e => { setSelectedClass(e.target.value); setSelectedSection(''); }}>
              <option value="">Select Class</option>
              {classes.map(c => <option key={c._id} value={c._id}>{c.name}</option>)}
            </select>
          </div>
          <div className="form-group" style={{ flex: 1 }}>
            <label className="form-label">Section</label>
            <select className="form-select" value={selectedSection} onChange={e => setSelectedSection(e.target.value)}>
              <option value="">All Sections</option>
              {(classDef?.sections || []).map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
        </div>
      </Card>

      {loading ? <PageLoader /> : !selectedClass ? null : !hasAny ? (
        <Card className="mt-4">
          <p style={{ color: 'var(--gray-400)', textAlign: 'center', padding: 40 }}>
            No timetable set for this class yet.
          </p>
        </Card>
      ) : DAYS.map(day => byDay[day].length > 0 ? (
        <Card key={day} title={day} className="mt-4">
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            {byDay[day].map((period, i) => (
              <div key={i} style={{
                background: period.isBreak ? 'var(--gray-100)' : '#eef2ff',
                borderRadius: 10, padding: '10px 16px', minWidth: 130,
                border: `1px solid ${period.isBreak ? 'var(--gray-300)' : '#c7d2fe'}`
              }}>
                {period.isBreak ? (
                  <div style={{ fontWeight: 600, fontSize: '0.85rem', color: 'var(--gray-500)' }}>
                    ☕ {period.breakLabel || 'Break'}
                  </div>
                ) : (
                  <div style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--primary)' }}>{period.subject}</div>
                )}
                <div style={{ fontSize: '0.75rem', color: 'var(--gray-500)', marginTop: 2 }}>
                  {period.startTime} – {period.endTime}
                </div>
                {!period.isBreak && period.teacherName && (
                  <div style={{ fontSize: '0.7rem', color: 'var(--gray-400)' }}>{period.teacherName}</div>
                )}
              </div>
            ))}
          </div>
        </Card>
      ) : null)}
    </div>
  );
}
