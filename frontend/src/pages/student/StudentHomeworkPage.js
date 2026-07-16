import React, { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import { homeworkAPI } from '../../api';
import { Card, PageLoader, EmptyState } from '../../components/common';
import toast from 'react-hot-toast';

export default function StudentHomeworkPage() {
  const { user } = useSelector(s => s.auth);
  const [homeworks, setHomeworks] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    homeworkAPI.getAll({ limit: 50 })
      .then(r => setHomeworks(r.data.data.homeworks || []))
      .catch(() => toast.error('Failed to load homework'))
      .finally(() => setLoading(false));
  }, [user]);

  if (loading) return <PageLoader />;
  const today = new Date();

  return (
    <div>
      <div className="page-header">
        <div className="page-header-left">
          <h1>My Homework</h1>
          <p>Active assignments for your class</p>
        </div>
      </div>

      {homeworks.length === 0
        ? <EmptyState icon="📚" title="No homework assigned" description="Homework assigned to your class will appear here" />
        : <Card title={`Active Homework (${homeworks.length})`}>
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>Subject</th>
                  <th>Title</th>
                  <th>Description</th>
                  <th>Assigned By</th>
                  <th>Assigned Date</th>
                  <th>Due Date</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {homeworks.map(hw => {
                  const overdue = new Date(hw.dueDate) < today && hw.status === 'active';
                  return (
                    <tr key={hw._id}>
                      <td style={{ fontWeight: 500 }}>{hw.subject}</td>
                      <td>{hw.title}</td>
                      <td style={{ maxWidth: 220, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: 'var(--gray-500)' }}>
                        {hw.description || '—'}
                      </td>
                      <td style={{ color: 'var(--gray-500)' }}>
                        {hw.teacherName || '—'}
                      </td>
                      <td style={{ color: 'var(--gray-500)' }}>
                        {new Date(hw.assignedDate || hw.createdAt).toLocaleDateString('en-IN')}
                      </td>
                      <td style={{ color: overdue ? 'var(--danger)' : undefined }}>
                        {new Date(hw.dueDate).toLocaleDateString('en-IN')}{overdue ? ' ⚠️' : ''}
                      </td>
                      <td>
                        <span className={`badge badge-${hw.status === 'active' ? 'success' : 'gray'}`}>
                          {hw.status}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      }
    </div>
  );
}
