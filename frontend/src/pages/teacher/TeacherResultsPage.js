import React, { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import { examAPI, classAPI } from '../../api';
import { Card, PageLoader, EmptyState, ProgressBar } from '../../components/common';
import toast from 'react-hot-toast';

export default function TeacherResultsPage() {
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

  useEffect(() => {
    if (!selectedExam) { setResults([]); return; }
    setResultsLoading(true);
    examAPI.getResults({ examId: selectedExam, classId: selectedClass || undefined })
      .then(r => setResults(r.data.data.results || []))
      .catch(() => toast.error('Failed to load results'))
      .finally(() => setResultsLoading(false));
  }, [selectedExam, selectedClass]);

  if (loading) return <PageLoader />;

  return (
    <div>
      <div className="page-header">
        <div className="page-header-left">
          <h1>Exam Results</h1>
          <p style={{ color: 'var(--gray-400)', fontSize: '0.875rem' }}>View published results for your class</p>
        </div>
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

      {resultsLoading ? <PageLoader /> : !selectedExam ? (
        <div className="card mt-4" style={{ textAlign: 'center', padding: 40, color: 'var(--gray-400)' }}>
          Select an exam to view results
        </div>
      ) : results.length === 0 ? (
        <EmptyState icon="📝" title="No results found" description="Marks haven't been entered or published yet for this exam" />
      ) : (
        <Card title={`Results (${results.length} students)`} className="mt-4">
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>Rank</th><th>Student</th><th>Class</th>
                  <th>Marks</th><th>%</th><th>Grade</th><th>Result</th>
                </tr>
              </thead>
              <tbody>
                {results.map((r, i) => {
                  const marksArr = r.marks || [];
                  const totalMax = r.totalMaxMarks ?? marksArr.reduce((s, m) => s + (m.maxMarks || 0), 0);
                  const totalObt = r.totalMarks ?? marksArr.reduce((s, m) => s + (m.isAbsent ? 0 : (m.marksObtained || 0)), 0);
                  const pct = r.obtainedPercentage ?? (totalMax > 0 ? Math.round((totalObt / totalMax) * 100) : 0);
                  return (
                    <tr key={r._id}>
                      <td style={{ color: 'var(--gray-400)', fontWeight: 600 }}>#{r.rank || i + 1}</td>
                      <td style={{ fontWeight: 500 }}>
                        {r.studentName || `${r.studentId?.firstName || ''} ${r.studentId?.lastName || ''}`}
                        {r.rollNumber && <div style={{ fontSize: '0.72rem', color: 'var(--gray-400)' }}>Roll: {r.rollNumber}</div>}
                      </td>
                      <td>{r.className || '—'}</td>
                      <td style={{ fontWeight: 500 }}>{totalObt}/{totalMax}</td>
                      <td style={{ minWidth: 100 }}><ProgressBar value={pct} /></td>
                      <td><strong>{r.grade || '—'}</strong></td>
                      <td>
                        <span className={`badge badge-${r.result === 'pass' ? 'success' : r.result === 'absent' ? 'gray' : 'danger'}`}>
                          {r.result === 'absent' ? 'Absent' : r.result === 'pass' ? 'Pass' : 'Fail'}
                        </span>
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
