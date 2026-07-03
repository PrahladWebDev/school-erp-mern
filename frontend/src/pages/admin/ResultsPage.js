import React, { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import { examAPI, classAPI } from '../../api';
import { Card, PageLoader, EmptyState, ProgressBar } from '../../components/common';
import toast from 'react-hot-toast';

const ROLE_BADGE = {
  school_admin: { label: 'Admin', color: 'var(--primary)' },
  teacher: { label: 'Teacher', color: 'var(--success)' },
  super_admin: { label: 'Super Admin', color: 'var(--warning)' },
};

function RoleBadge({ role }) {
  const cfg = ROLE_BADGE[role] || { label: role || 'Unknown', color: 'var(--gray-400)' };
  return (
    <span style={{
      fontSize: '0.72rem', background: cfg.color, color: '#fff',
      padding: '2px 8px', borderRadius: 99, whiteSpace: 'nowrap'
    }}>
      {cfg.label}
    </span>
  );
}

export default function ResultsPage() {
  const { school } = useSelector(s => s.auth);
  const [exams, setExams] = useState([]);
  const [classes, setClasses] = useState([]);
  const [selectedExam, setSelectedExam] = useState('');
  const [selectedClass, setSelectedClass] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(true);
  const [resultsLoading, setResultsLoading] = useState(false);

  useEffect(() => {
    Promise.all([
      examAPI.getAll({ academicYear: school?.currentAcademicYear }),
      classAPI.getAll({})
    ])
      .then(([eRes, cRes]) => {
        setExams(eRes.data.data.exams || []);
        setClasses(cRes.data.data.classes || []);
      })
      .catch(() => toast.error('Failed to load data'))
      .finally(() => setLoading(false));
  }, [school]);

  const loadResults = async () => {
    if (!selectedExam) return;
    setResultsLoading(true);
    try {
      const { data } = await examAPI.getResults({
        examId: selectedExam,
        classId: selectedClass || undefined
      });
      setResults(data.data.results || []);
    } catch { toast.error('Failed to load results'); }
    finally { setResultsLoading(false); }
  };

  useEffect(() => { loadResults(); }, [selectedExam, selectedClass]);

  const handlePublish = async (examId) => {
    try {
      await examAPI.publish(examId);
      toast.success('Results published!');
      setExams(prev => prev.map(e => e._id === examId ? { ...e, status: 'published' } : e));
    } catch (err) { toast.error(err.response?.data?.message || 'Failed to publish'); }
  };

  if (loading) return <PageLoader />;

  return (
    <div>
      <div className="page-header">
        <div className="page-header-left"><h1>Exam Results</h1></div>
      </div>

      <Card title="Filter Results">
        <div style={{ display: 'flex', gap: 16 }}>
          <div className="form-group" style={{ flex: 1 }}>
            <label className="form-label">Exam</label>
            <select className="form-select" value={selectedExam} onChange={e => setSelectedExam(e.target.value)}>
              <option value="">Select Exam</option>
              {exams.map(ex => <option key={ex._id} value={ex._id}>{ex.name}</option>)}
            </select>
          </div>
          <div className="form-group" style={{ flex: 1 }}>
            <label className="form-label">Class (optional)</label>
            <select className="form-select" value={selectedClass} onChange={e => setSelectedClass(e.target.value)}>
              <option value="">All Classes</option>
              {classes.map(c => <option key={c._id} value={c._id}>{c.name}</option>)}
            </select>
          </div>
        </div>
      </Card>

      {selectedExam && (
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 12, marginBottom: 4 }}>
          {exams.find(e => e._id === selectedExam)?.status !== 'published' && (
            <button className="btn btn-primary" onClick={() => handlePublish(selectedExam)}>Publish Results</button>
          )}
        </div>
      )}

      {resultsLoading ? <PageLoader /> : !selectedExam ? (
        <div className="card mt-4" style={{ textAlign: 'center', padding: 40, color: 'var(--gray-400)' }}>
          Select an exam to view results
        </div>
      ) : results.length === 0 ? (
        <EmptyState icon="📝" title="No results found" description="Marks haven't been entered yet for the selected exam" />
      ) : (
        <Card title={`Results (${results.length} students)`} className="mt-4">
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>#</th>
                  <th>Student</th>
                  <th>Class</th>
                  <th>Marks</th>
                  <th>%</th>
                  <th>Grade</th>
                  <th>Result</th>
                  <th>Entered By</th>
                </tr>
              </thead>
              <tbody>
                {results.map((r, i) => {
                  // DB stores marks in `marks` array (not subjectMarks)
                  const marksArr = r.marks || [];
                  const totalMax = r.totalMaxMarks ?? marksArr.reduce((s, m) => s + (m.maxMarks || 0), 0);
                  const totalObt = r.totalMarks ?? marksArr.reduce((s, m) => s + (m.isAbsent ? 0 : (m.marksObtained || 0)), 0);
                  const pct = r.obtainedPercentage ?? (totalMax > 0 ? Math.round((totalObt / totalMax) * 100) : 0);
                  return (
                    <tr key={r._id}>
                      <td style={{ color: 'var(--gray-400)' }}>{r.rank || i + 1}</td>
                      <td style={{ fontWeight: 500 }}>
                        {r.studentId?.firstName || r.studentName} {r.studentId?.lastName || ''}
                        {r.rollNumber && (
                          <div style={{ fontSize: '0.72rem', color: 'var(--gray-400)' }}>Roll: {r.rollNumber}</div>
                        )}
                      </td>
                      <td>{r.className || r.studentId?.class?.name || '—'}</td>
                      <td style={{ fontWeight: 500 }}>{totalObt}/{totalMax}</td>
                      <td style={{ minWidth: 100 }}><ProgressBar value={pct} /></td>
                      <td><strong>{r.grade || '—'}</strong></td>
                      <td>
                        <span className={`badge badge-${r.isPassed || r.result === 'pass' ? 'success' : r.result === 'absent' ? 'gray' : 'danger'}`}>
                          {r.result === 'absent' ? 'Absent' : (r.isPassed || r.result === 'pass') ? 'Pass' : 'Fail'}
                        </span>
                      </td>
                      <td>
                        {r.enteredByRole ? (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                            <RoleBadge role={r.enteredByRole} />
                            {r.enteredByName && (
                              <span style={{ fontSize: '0.72rem', color: 'var(--gray-500)' }}>{r.enteredByName}</span>
                            )}
                          </div>
                        ) : <span style={{ color: 'var(--gray-400)', fontSize: '0.8rem' }}>—</span>}
                      </td>
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
