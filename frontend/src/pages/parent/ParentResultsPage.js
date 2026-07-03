import React, { useEffect, useState } from 'react';
import { examAPI, parentAPI } from '../../api';
import { Card, PageLoader, EmptyState, ProgressBar } from '../../components/common';
import toast from 'react-hot-toast';

export default function ParentResultsPage() {
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const childrenRes = await parentAPI.getChildren();
        const children = childrenRes.data.data.children || [];
        if (children.length === 0) { setLoading(false); return; }
        const res = await examAPI.getResults({ studentId: children[0]._id });
        setResults(res.data.data.results || []);
      } catch { toast.error('Failed to load results'); }
      finally { setLoading(false); }
    };
    load();
  }, []);

  if (loading) return <PageLoader />;

  return (
    <div>
      <div className="page-header"><div className="page-header-left"><h1>Exam Results</h1></div></div>
      {results.length === 0
        ? <EmptyState icon="📝" title="No results yet" description="Published results will appear here" />
        : results.map(result => {
          const totalMax = result.subjectMarks?.reduce((s, m) => s + m.maxMarks, 0) || 0;
          const totalObt = result.subjectMarks?.reduce((s, m) => s + m.marksObtained, 0) || 0;
          const pct = totalMax > 0 ? Math.round((totalObt / totalMax) * 100) : 0;
          return (
            <Card key={result._id} title={result.examId?.name || 'Exam'} className="mb-4">
              <div className="grid-4 mb-4">
                <div style={{ textAlign: 'center' }}><div style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--primary)' }}>{pct}%</div><div style={{ fontSize: '0.8rem', color: 'var(--gray-400)' }}>Overall</div></div>
                <div style={{ textAlign: 'center' }}><div style={{ fontSize: '1.5rem', fontWeight: 700 }}>{totalObt}/{totalMax}</div><div style={{ fontSize: '0.8rem', color: 'var(--gray-400)' }}>Marks</div></div>
                <div style={{ textAlign: 'center' }}><div style={{ fontSize: '1.5rem', fontWeight: 700, color: result.isPassed ? 'var(--success)' : 'var(--danger)' }}>{result.isPassed ? 'PASS' : 'FAIL'}</div><div style={{ fontSize: '0.8rem', color: 'var(--gray-400)' }}>Result</div></div>
                <div style={{ textAlign: 'center' }}><div style={{ fontSize: '1.5rem', fontWeight: 700 }}>{result.grade || '—'}</div><div style={{ fontSize: '0.8rem', color: 'var(--gray-400)' }}>Grade</div></div>
              </div>
              <ProgressBar value={pct} />
              {result.subjectMarks?.length > 0 && (
                <div className="table-wrapper mt-4"><table>
                  <thead><tr><th>Subject</th><th>Obtained</th><th>Max</th><th>Pass Marks</th><th>Status</th></tr></thead>
                  <tbody>
                    {result.subjectMarks.map((m, i) => (
                      <tr key={i}>
                        <td style={{ fontWeight: 500 }}>{m.subjectName}</td>
                        <td>{m.marksObtained}</td>
                        <td>{m.maxMarks}</td>
                        <td>{m.passMarks}</td>
                        <td><span className={`badge badge-${m.marksObtained >= m.passMarks ? 'success' : 'danger'}`}>{m.marksObtained >= m.passMarks ? 'Pass' : 'Fail'}</span></td>
                      </tr>
                    ))}
                  </tbody>
                </table></div>
              )}
            </Card>
          );
        })
      }
    </div>
  );
}
