import React, { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import { examAPI, studentAPI } from '../../api';
import { Card, PageLoader, EmptyState } from '../../components/common';
import toast from 'react-hot-toast';

export default function ExamMarksPage() {
  const { school, user } = useSelector(s => s.auth);
  const [exams, setExams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedExam, setSelectedExam] = useState(null);
  const [students, setStudents] = useState([]);
  const [marks, setMarks] = useState({});
  const [absent, setAbsent] = useState({});
  const [saving, setSaving] = useState(false);
  const [studentsLoading, setStudentsLoading] = useState(false);

  useEffect(() => {
    examAPI.getAll({ academicYear: school?.currentAcademicYear })
      .then(r => setExams(r.data.data.exams || []))
      .catch(() => toast.error('Failed to load exams'))
      .finally(() => setLoading(false));
  }, [school]);

  const openExam = async (exam) => {
    setSelectedExam(exam);
    setStudentsLoading(true);
    try {
      const { data } = await studentAPI.getAll({
        classId: exam.classId?._id || exam.classId,
        status: 'active', limit: 200,
        academicYear: school?.currentAcademicYear
      });
      const stuList = data.data.students || [];
      setStudents(stuList);
      const initMarks = {};
      const initAbsent = {};
      stuList.forEach(s => {
        initMarks[s._id] = {};
        initAbsent[s._id] = {};
        exam.subjects?.forEach(sub => {
          initMarks[s._id][sub.subjectName] = '';
          initAbsent[s._id][sub.subjectName] = false;
        });
      });
      setMarks(initMarks);
      setAbsent(initAbsent);
    } catch { toast.error('Failed to load students'); }
    finally { setStudentsLoading(false); }
  };

  const setMark = (studentId, subject, val) =>
    setMarks(m => ({ ...m, [studentId]: { ...m[studentId], [subject]: val } }));

  const toggleAbsent = (studentId, subject) =>
    setAbsent(a => ({ ...a, [studentId]: { ...a[studentId], [subject]: !a[studentId]?.[subject] } }));

  const handleSubmit = async () => {
    if (!selectedExam) return;
    setSaving(true);
    try {
      // Send in the format the backend expects: { results: [{ studentId, marks: [...] }] }
      const results = students.map(s => ({
        studentId: s._id,
        marks: (selectedExam.subjects || []).map(sub => ({
          subjectName: sub.subjectName,
          marksObtained: absent[s._id]?.[sub.subjectName] ? 0 : parseFloat(marks[s._id]?.[sub.subjectName] || 0),
          maxMarks: sub.maxMarks,
          passMarks: sub.passMarks,
          isAbsent: !!absent[s._id]?.[sub.subjectName]
        }))
      }));
      await examAPI.enterMarks(selectedExam._id, { results });
      toast.success('Marks saved successfully!');
      setSelectedExam(null);
    } catch (err) { toast.error(err.response?.data?.message || 'Failed to save marks'); }
    finally { setSaving(false); }
  };

  if (loading) return <PageLoader />;

  if (selectedExam) {
    return (
      <div>
        <div className="page-header">
          <div className="page-header-left">
            <h1>Enter Marks</h1>
            <p style={{ color: 'var(--gray-400)', fontSize: '0.875rem' }}>
              {selectedExam.name} — {selectedExam.classId?.name || ''} &nbsp;
              <span style={{ fontSize: '0.78rem', background: 'var(--primary)', color: '#fff', padding: '2px 8px', borderRadius: 99 }}>
                {user?.role === 'school_admin' ? 'Admin' : user?.role === 'teacher' ? 'Teacher' : user?.role || 'Admin'}
              </span>
            </p>
          </div>
          <div style={{ display: 'flex', gap: 12 }}>
            <button className="btn btn-ghost" onClick={() => setSelectedExam(null)}>← Back</button>
            <button className="btn btn-primary" onClick={handleSubmit} disabled={saving}>
              {saving ? 'Saving...' : '💾 Save Marks'}
            </button>
          </div>
        </div>

        {studentsLoading ? <PageLoader /> : (
          <Card title={`Students (${students.length})`}>
            <p style={{ fontSize: '0.8rem', color: 'var(--gray-400)', marginBottom: 12 }}>
              ℹ️ Check "Absent" if a student was absent for that subject.
            </p>
            <div className="table-wrapper">
              <table>
                <thead>
                  <tr>
                    <th>Student</th>
                    {selectedExam.subjects?.map(sub => (
                      <th key={sub.subjectName} style={{ minWidth: 100 }}>
                        {sub.subjectName}
                        <br />
                        <span style={{ fontSize: '0.7rem', fontWeight: 400, color: 'var(--gray-400)' }}>
                          Max: {sub.maxMarks} | Pass: {sub.passMarks}
                        </span>
                      </th>
                    ))}
                    <th>Total</th>
                  </tr>
                </thead>
                <tbody>
                  {students.map(s => {
                    const total = (selectedExam.subjects || []).reduce((sum, sub) => {
                      if (absent[s._id]?.[sub.subjectName]) return sum;
                      return sum + (parseFloat(marks[s._id]?.[sub.subjectName]) || 0);
                    }, 0);
                    return (
                      <tr key={s._id}>
                        <td style={{ fontWeight: 500, whiteSpace: 'nowrap' }}>
                          {s.firstName} {s.lastName}
                          <div style={{ fontSize: '0.75rem', color: 'var(--gray-400)' }}>{s.admissionNumber}</div>
                        </td>
                        {selectedExam.subjects?.map(sub => (
                          <td key={sub.subjectName}>
                            {absent[s._id]?.[sub.subjectName] ? (
                              <div>
                                <span style={{ color: 'var(--danger)', fontWeight: 600, fontSize: '0.8rem' }}>ABSENT</span>
                                <br />
                                <button
                                  style={{ fontSize: '0.7rem', color: 'var(--gray-400)', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline' }}
                                  onClick={() => toggleAbsent(s._id, sub.subjectName)}>undo</button>
                              </div>
                            ) : (
                              <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                                <input
                                  type="number" className="form-input"
                                  style={{ width: 64, padding: '4px 8px' }}
                                  min={0} max={sub.maxMarks}
                                  value={marks[s._id]?.[sub.subjectName] ?? ''}
                                  onChange={e => setMark(s._id, sub.subjectName, e.target.value)}
                                />
                                <button
                                  title="Mark absent"
                                  style={{ fontSize: '0.7rem', color: 'var(--danger)', background: 'none', border: '1px solid var(--danger)', borderRadius: 4, cursor: 'pointer', padding: '2px 4px', whiteSpace: 'nowrap' }}
                                  onClick={() => toggleAbsent(s._id, sub.subjectName)}>A</button>
                              </div>
                            )}
                          </td>
                        ))}
                        <td style={{ fontWeight: 600, color: 'var(--primary)' }}>{total}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Card>
        )}
      </div>
    );
  }

  return (
    <div>
      <div className="page-header">
        <div className="page-header-left">
          <h1>Enter Marks</h1>
          <p style={{ color: 'var(--gray-400)', fontSize: '0.875rem' }}>Admin marks entry — select an exam below</p>
        </div>
      </div>
      {exams.length === 0
        ? <EmptyState icon="📝" title="No exams available" description="Create exams from the Exams page first" />
        : <Card title="Select Exam to Enter Marks">
          <div className="table-wrapper">
            <table>
              <thead><tr><th>Exam Name</th><th>Type</th><th>Class</th><th>Date</th><th>Status</th><th></th></tr></thead>
              <tbody>
                {exams.map(ex => (
                  <tr key={ex._id}>
                    <td style={{ fontWeight: 500 }}>{ex.name}</td>
                    <td style={{ textTransform: 'capitalize' }}>{ex.examType?.replace('_', ' ')}</td>
                    <td>{ex.classId?.name || '—'}</td>
                    <td>{ex.startDate ? new Date(ex.startDate).toLocaleDateString('en-IN') : '—'}</td>
                    <td>
                      <span className={`badge badge-${ex.status === 'completed' ? 'success' : ex.status === 'ongoing' ? 'warning' : 'info'}`}>
                        {ex.status}
                      </span>
                    </td>
                    <td>
                      {ex.status !== 'cancelled' && (
                        <button className="btn btn-primary btn-sm" onClick={() => openExam(ex)}>Enter Marks</button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      }
    </div>
  );
}
