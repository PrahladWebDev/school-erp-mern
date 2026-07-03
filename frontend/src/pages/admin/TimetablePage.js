import React, { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import { timetableAPI, classAPI } from '../../api';
import { Card, PageLoader, Modal } from '../../components/common';
import toast from 'react-hot-toast';

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export default function TimetablePage() {
  const { school } = useSelector(s => s.auth);
  const [classes, setClasses] = useState([]);
  const [selectedClass, setSelectedClass] = useState('');
  const [selectedSection, setSelectedSection] = useState('');
  const [timetable, setTimetable] = useState(null);
  const [loading, setLoading] = useState(false);
  const [modal, setModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [slotForm, setSlotForm] = useState({
    day: 'Monday', startTime: '', endTime: '', subject: '', teacherName: '', isBreak: false, breakLabel: ''
  });

  useEffect(() => {
    classAPI.getAll({ academicYear: school?.currentAcademicYear })
      .then(r => setClasses(r.data.data.classes || []))
      .catch(() => toast.error('Failed to load classes'));
  }, [school]);

  const loadTimetable = async () => {
    if (!selectedClass) return;
    setLoading(true);
    try {
      const { data } = await timetableAPI.get({
        classId: selectedClass,
        section: selectedSection || undefined,
        academicYear: school?.currentAcademicYear
      });
      setTimetable(data.data.timetable);
    } catch { setTimetable(null); }
    finally { setLoading(false); }
  };

  useEffect(() => { loadTimetable(); }, [selectedClass, selectedSection]);

  // Build a flat list of slots from the schedule[] structure the DB returns
  const buildSlotsFromSchedule = (schedule = []) => {
    const flat = [];
    schedule.forEach(dayObj => {
      (dayObj.periods || []).forEach(period => {
        flat.push({
          day: dayObj.day,
          startTime: period.startTime,
          endTime: period.endTime,
          subject: period.isBreak ? (period.breakLabel || 'Break') : period.subject,
          teacherName: period.teacherName || '',
          isBreak: !!period.isBreak,
          periodNumber: period.periodNumber
        });
      });
    });
    return flat.sort((a, b) => a.startTime?.localeCompare(b.startTime));
  };

  const handleAddSlot = async () => {
    if (!slotForm.isBreak && (!slotForm.startTime || !slotForm.endTime || !slotForm.subject)) {
      return toast.error('Fill all required fields');
    }
    if (slotForm.isBreak && (!slotForm.startTime || !slotForm.endTime)) {
      return toast.error('Fill start and end time for break');
    }

    setSaving(true);
    try {
      // Get existing schedule or start fresh
      const existingSchedule = timetable?.schedule || [];

      // Find or create the day entry
      const dayIndex = existingSchedule.findIndex(d => d.day === slotForm.day);
      const newPeriod = {
        periodNumber: dayIndex >= 0
          ? (existingSchedule[dayIndex].periods?.length || 0) + 1
          : 1,
        startTime: slotForm.startTime,
        endTime: slotForm.endTime,
        subject: slotForm.isBreak ? '' : slotForm.subject,
        teacherName: slotForm.teacherName || '',
        isBreak: !!slotForm.isBreak,
        breakLabel: slotForm.isBreak ? (slotForm.breakLabel || 'Break') : ''
      };

      let updatedSchedule;
      if (dayIndex >= 0) {
        updatedSchedule = existingSchedule.map((d, i) =>
          i === dayIndex
            ? { ...d, periods: [...(d.periods || []), newPeriod] }
            : d
        );
      } else {
        updatedSchedule = [...existingSchedule, { day: slotForm.day, periods: [newPeriod] }];
      }

      await timetableAPI.create({
        classId: selectedClass,
        section: selectedSection || undefined,
        academicYear: school?.currentAcademicYear,
        schedule: updatedSchedule
      });

      toast.success('Slot added!');
      setModal(false);
      setSlotForm({ day: 'Monday', startTime: '', endTime: '', subject: '', teacherName: '', isBreak: false, breakLabel: '' });
      loadTimetable();
    } catch (err) { toast.error(err.response?.data?.message || 'Failed to save slot'); }
    finally { setSaving(false); }
  };

  const classDef = classes.find(c => c._id === selectedClass);
  const schedule = timetable?.schedule || [];
  const byDay = {};
  DAYS.forEach(d => {
    const dayObj = schedule.find(s => s.day === d);
    byDay[d] = (dayObj?.periods || []).slice().sort((a, b) => a.startTime?.localeCompare(b.startTime));
  });

  const totalSlots = schedule.reduce((sum, d) => sum + (d.periods?.length || 0), 0);

  return (
    <div>
      <div className="page-header">
        <div className="page-header-left"><h1>Timetable</h1></div>
        {selectedClass && (
          <button className="btn btn-primary" onClick={() => setModal(true)}>+ Add Slot</button>
        )}
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

      {loading ? <PageLoader /> : selectedClass ? (
        totalSlots === 0
          ? <Card className="mt-4">
              <p style={{ color: 'var(--gray-400)', textAlign: 'center', padding: 40 }}>
                No timetable slots added yet. Click "+ Add Slot" to get started.
              </p>
            </Card>
          : DAYS.map(day => byDay[day].length > 0 ? (
            <Card key={day} title={day} className="mt-4">
              <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                {byDay[day].map((period, i) => (
                  <div key={i} style={{
                    background: period.isBreak ? 'var(--gray-100)' : 'var(--gray-50)',
                    borderRadius: 10, padding: '10px 16px', minWidth: 130,
                    border: `1px solid ${period.isBreak ? 'var(--gray-300)' : 'var(--gray-200)'}`
                  }}>
                    {period.isBreak ? (
                      <div style={{ fontWeight: 600, fontSize: '0.85rem', color: 'var(--gray-500)' }}>
                        ☕ {period.breakLabel || 'Break'}
                      </div>
                    ) : (
                      <div style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--primary)' }}>
                        {period.subject}
                      </div>
                    )}
                    <div style={{ fontSize: '0.75rem', color: 'var(--gray-500)', marginTop: 2 }}>
                      {period.startTime} – {period.endTime}
                    </div>
                    {period.teacherName && (
                      <div style={{ fontSize: '0.7rem', color: 'var(--gray-400)' }}>{period.teacherName}</div>
                    )}
                  </div>
                ))}
              </div>
            </Card>
          ) : null)
      ) : null}

      <Modal isOpen={modal} onClose={() => setModal(false)} title="Add Timetable Slot"
        footer={
          <>
            <button className="btn btn-ghost" onClick={() => setModal(false)}>Cancel</button>
            <button className="btn btn-primary" onClick={handleAddSlot} disabled={saving}>
              {saving ? 'Adding...' : 'Add Slot'}
            </button>
          </>
        }>
        <div className="form-grid">
          <div className="form-group">
            <label className="form-label">Day</label>
            <select className="form-select" value={slotForm.day}
              onChange={e => setSlotForm(f => ({ ...f, day: e.target.value }))}>
              {DAYS.map(d => <option key={d} value={d}>{d}</option>)}
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">Type</label>
            <select className="form-select" value={slotForm.isBreak ? 'break' : 'class'}
              onChange={e => setSlotForm(f => ({ ...f, isBreak: e.target.value === 'break' }))}>
              <option value="class">Class Period</option>
              <option value="break">Break / Lunch</option>
            </select>
          </div>

          {slotForm.isBreak ? (
            <div className="form-group" style={{ gridColumn: '1/-1' }}>
              <label className="form-label">Break Label</label>
              <input className="form-input" value={slotForm.breakLabel}
                onChange={e => setSlotForm(f => ({ ...f, breakLabel: e.target.value }))}
                placeholder="Lunch Break" />
            </div>
          ) : (
            <div className="form-group" style={{ gridColumn: '1/-1' }}>
              <label className="form-label">Subject *</label>
              <input className="form-input" value={slotForm.subject}
                onChange={e => setSlotForm(f => ({ ...f, subject: e.target.value }))}
                placeholder="Mathematics" />
            </div>
          )}

          <div className="form-group">
            <label className="form-label">Start Time *</label>
            <input className="form-input" type="time" value={slotForm.startTime}
              onChange={e => setSlotForm(f => ({ ...f, startTime: e.target.value }))} />
          </div>
          <div className="form-group">
            <label className="form-label">End Time *</label>
            <input className="form-input" type="time" value={slotForm.endTime}
              onChange={e => setSlotForm(f => ({ ...f, endTime: e.target.value }))} />
          </div>

          {!slotForm.isBreak && (
            <div className="form-group" style={{ gridColumn: '1/-1' }}>
              <label className="form-label">Teacher Name (optional)</label>
              <input className="form-input" value={slotForm.teacherName}
                onChange={e => setSlotForm(f => ({ ...f, teacherName: e.target.value }))}
                placeholder="Optional" />
            </div>
          )}
        </div>
      </Modal>
    </div>
  );
}
