import React, { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import { examAPI } from '../../api';
import { Card, PageLoader, EmptyState } from '../../components/common';
import toast from 'react-hot-toast';

export default function TeacherExamPage() {
  const { school } = useSelector(s => s.auth);
  const [exams, setExams] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    examAPI.getAll({ academicYear: school?.currentAcademicYear })
      .then(r => setExams(r.data.data.exams || []))
      .catch(() => toast.error('Failed to load exams'))
      .finally(() => setLoading(false));
  }, [school]);

  if (loading) return <PageLoader />;

  const STATUS_COLOR = {
    upcoming: 'info',
    ongoing: 'warning',
    completed: 'success',
    cancelled: 'danger'
  };

  return (
    <div>
      <div className="page-header">
        <div className="page-header-left">
          <h1>Exams</h1>
          <p style={{ color: 'var(--gray-400)', fontSize: '0.875rem' }}>
            Exams scheduled for your class
          </p>
        </div>
      </div>

      <div className="card mb-4" style={{ background: 'var(--warning-light, #fffbeb)', border: '1px solid var(--warning, #f59e0b)', borderRadius: 10, padding: '12px 18px' }}>
        <p style={{ margin: 0, fontSize: '0.875rem', color: 'var(--warning-dark, #92400e)' }}>
          ℹ️ <strong>Note:</strong> Marks entry is handled by the School Admin. Contact your admin to enter or update exam marks.
        </p>
      </div>

      {exams.length === 0
        ? <EmptyState icon="📝" title="No exams found" description="Exams assigned to your class will appear here" />
        : <Card title={`Exams (${exams.length})`}>
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>Exam Name</th>
                  <th>Type</th>
                  <th>Class</th>
                  <th>Start Date</th>
                  <th>End Date</th>
                  <th>Status</th>
                  <th>Results</th>
                </tr>
              </thead>
              <tbody>
                {exams.map(ex => (
                  <tr key={ex._id}>
                    <td style={{ fontWeight: 500 }}>{ex.name}</td>
                    <td style={{ textTransform: 'capitalize' }}>{ex.examType?.replace('_', ' ')}</td>
                    <td>{ex.classId?.name || '—'}</td>
                    <td>{ex.startDate ? new Date(ex.startDate).toLocaleDateString('en-IN') : '—'}</td>
                    <td>{ex.endDate ? new Date(ex.endDate).toLocaleDateString('en-IN') : '—'}</td>
                    <td>
                      <span className={`badge badge-${STATUS_COLOR[ex.status] || 'gray'}`}>
                        {ex.status}
                      </span>
                    </td>
                    <td>
                      {ex.isResultPublished
                        ? <span className="badge badge-success">Published</span>
                        : ex.status === 'completed'
                          ? <span className="badge badge-warning">Pending publish</span>
                          : <span style={{ fontSize: '0.78rem', color: 'var(--gray-400)' }}>—</span>
                      }
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
