import React, { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import { timetableAPI, studentAPI } from '../../api';
import { Card, PageLoader } from '../../components/common';
import toast from 'react-hot-toast';

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export default function StudentTimetablePage() {
  const { user, school } = useSelector(s => s.auth);
  const [timetable, setTimetable] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchTimetable = async () => {
      setLoading(true);
      try {
        // PRIMARY: use the dedicated /my endpoint which resolves class server-side
        const { data } = await timetableAPI.getMy();
        setTimetable(data.data.timetable || null);
      } catch {
        // FALLBACK: resolve classId via profile fetch then call generic endpoint
        // (handles cases where /my route is not yet deployed)
        try {
          let classId = user?.classId; // injected by getMe backend fix

          if (!classId && user?.profileId) {
            const { data: profileData } = await studentAPI.getById(user.profileId);
            const student = profileData.data?.student;
            classId = student?.class?._id || student?.class;
          }

          if (!classId) return;

          const params = { classId };
          if (school?.currentAcademicYear) params.academicYear = school.currentAcademicYear;

          const { data } = await timetableAPI.get(params);
          setTimetable(data.data.timetable || null);
        } catch {
          toast.error('Failed to load timetable');
        }
      } finally {
        setLoading(false);
      }
    };

    fetchTimetable();
  }, [user, school]);

  if (loading) return <PageLoader />;

  const schedule = timetable?.schedule || [];
  const byDay = {};
  DAYS.forEach(d => {
    const dayObj = schedule.find(s => s.day === d);
    byDay[d] = (dayObj?.periods || []).slice().sort((a, b) => a.startTime?.localeCompare(b.startTime));
  });

  const hasAnyPeriod = schedule.some(d => d.periods?.length > 0);

  return (
    <div>
      <div className="page-header">
        <div className="page-header-left"><h1>My Timetable</h1></div>
      </div>

      {!timetable || !hasAnyPeriod
        ? <Card title="Timetable">
            <p style={{ color: 'var(--gray-400)', textAlign: 'center', padding: 40 }}>
              No timetable available yet. Please check back later.
            </p>
          </Card>
        : DAYS.map(day => byDay[day].length > 0 ? (
          <Card key={day} title={day} className="mb-4">
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
              {byDay[day].map((period, i) => (
                <div key={i} style={{
                  background: period.isBreak ? 'var(--gray-100)' : 'var(--primary-light, #eef2ff)',
                  borderRadius: 10, padding: '10px 16px', minWidth: 120,
                  border: `1px solid ${period.isBreak ? 'var(--gray-300)' : 'var(--primary-border, #c7d2fe)'}`
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
                  {!period.isBreak && period.teacherName && (
                    <div style={{ fontSize: '0.7rem', color: 'var(--gray-400)', marginTop: 2 }}>
                      {period.teacherName}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </Card>
        ) : null)
      }
    </div>
  );
}
