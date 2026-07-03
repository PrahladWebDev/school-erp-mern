import React, { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import { examAPI } from '../../api';
import { Card, PageLoader, EmptyState, ProgressBar } from '../../components/common';
import toast from 'react-hot-toast';

export default function StudentResultsPage() {
  const { user } = useSelector(s => s.auth);
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.profileId) { setLoading(false); return; }
    examAPI.getResults({ studentId: user.profileId })
      .then(r => {
        const raw = r.data.data.results || [];
        // Only show published results
        setResults(raw.filter(r => r.isPublished));
      })
      .catch(() => toast.error('Failed to load results'))
      .finally(() => setLoading(false));
  }, [user]);

  if (loading) return <PageLoader />;

  return (
    <div>
      <div className="page-header">
        <div className="page-header-left"><h1>My Results</h1></div>
      </div>

      {results.length === 0
        ? <EmptyState icon="📝" title="No results yet" description="Your exam results will appear here once published by admin" />
        : results.map(result => {
          // Backend stores marks in `marks` field (not subjectMarks)
          const marksArr = result.marks || [];
          const totalMax = marksArr.reduce((s, m) => s + (m.maxMarks || 0), 0);
          const totalObt = marksArr.reduce((s, m) => s + (m.isAbsent ? 0 : (m.marksObtained || 0)), 0);
          const pct = result.obtainedPercentage ?? (totalMax > 0 ? Math.round((totalObt / totalMax) * 100) : 0);
          const isPassed = result.result === 'pass';
          const isAbsent = result.result === 'absent';

          return (
            <Card key={result._id} title={result.examName || result.examId?.name || 'Exam Result'} className="mb-4">
              <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap', alignItems: 'center' }}>
                <span style={{ fontSize: '0.8rem', color: 'var(--gray-400)' }}>
                  📚 {result.className} &nbsp;|&nbsp; 🎓 {result.examType?.replace('_', ' ')}
                </span>
                {result.rank && (
                  <span style={{ fontSize: '0.8rem', background: 'var(--primary)', color: '#fff', padding: '2px 8px', borderRadius: 99 }}>
                    Rank #{result.rank}
                  </span>
                )}
                {result.enteredByRole && (
                  <span style={{ fontSize: '0.75rem', color: 'var(--gray-400)' }}>
                    Marks entered by: <strong style={{ textTransform: 'capitalize' }}>{result.enteredByRole}</strong>
                  </span>
                )}
              </div>

              <div className="grid-4 mb-4">
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--primary)' }}>{pct}%</div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--gray-400)' }}>Overall</div>
                </div>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '1.5rem', fontWeight: 700 }}>{result.totalMarks ?? totalObt}</div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--gray-400)' }}>Marks Obtained</div>
                </div>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '1.5rem', fontWeight: 700 }}>{result.totalMaxMarks ?? totalMax}</div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--gray-400)' }}>Total Marks</div>
                </div>
                <div style={{ textAlign: 'center' }}>
                  <div style={{
                    fontSize: '1.5rem', fontWeight: 700,
                    color: isAbsent ? 'var(--gray-400)' : isPassed ? 'var(--success)' : 'var(--danger)'
                  }}>
                    {isAbsent ? 'ABSENT' : isPassed ? 'PASS' : 'FAIL'}
                  </div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--gray-400)' }}>Result</div>
                </div>
              </div>

              <ProgressBar value={pct} />

              {result.grade && (
                <div style={{ textAlign: 'center', marginTop: 8 }}>
                  <span style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--primary)' }}>
                    Grade: {result.grade}
                  </span>
                </div>
              )}

              {marksArr.length > 0 && (
                <div className="table-wrapper mt-4">
                  <table>
                    <thead>
                      <tr>
                        <th>Subject</th>
                        <th>Obtained</th>
                        <th>Max</th>
                        <th>Pass Marks</th>
                        <th>Grade</th>
                        <th>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {marksArr.map((m, i) => (
                        <tr key={i}>
                          <td style={{ fontWeight: 500 }}>{m.subjectName}</td>
                          <td>{m.isAbsent ? '—' : m.marksObtained}</td>
                          <td>{m.maxMarks}</td>
                          <td>{m.passMarks}</td>
                          <td>{m.grade || '—'}</td>
                          <td>
                            {m.isAbsent
                              ? <span className="badge badge-gray">Absent</span>
                              : m.marksObtained >= m.passMarks
                                ? <span className="badge badge-success">Pass</span>
                                : <span className="badge badge-danger">Fail</span>
                            }
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </Card>
          );
        })
      }
    </div>
  );
}
