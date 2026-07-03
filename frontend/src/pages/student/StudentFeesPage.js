import React, { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import { feesAPI } from '../../api';
import { Card, PageLoader, EmptyState } from '../../components/common';
import toast from 'react-hot-toast';

export default function StudentFeesPage() {
  const { user } = useSelector(s => s.auth);
  const [fees, setFees] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.profileId) { setLoading(false); return; }
    feesAPI.getStudentFees(user.profileId)
      .then(r => setFees(r.data.data.fees || []))
      .catch(() => toast.error('Failed to load fees'))
      .finally(() => setLoading(false));
  }, [user]);

  if (loading) return <PageLoader />;

  const totalDue = fees.reduce((s, f) => s + (f.dueAmount || 0), 0);
  const totalPaid = fees.reduce((s, f) => s + (f.paidAmount || 0), 0);

  const STATUS_COLOR = { paid: 'success', partial: 'warning', pending: 'danger', overdue: 'danger' };

  return (
    <div>
      <div className="page-header">
        <div className="page-header-left"><h1>My Fees</h1></div>
      </div>

      <div className="grid-3 mb-5">
        <div className="stat-card"><div className="stat-icon" style={{ background:'#f0fdf4',color:'#16a34a' }}>✅</div><div className="stat-info"><div className="stat-value">₹{totalPaid.toLocaleString('en-IN')}</div><div className="stat-label">Total Paid</div></div></div>
        <div className="stat-card"><div className="stat-icon" style={{ background:'#fef2f2',color:'#dc2626' }}>💳</div><div className="stat-info"><div className="stat-value">₹{totalDue.toLocaleString('en-IN')}</div><div className="stat-label">Total Due</div></div></div>
        <div className="stat-card"><div className="stat-icon" style={{ background:'#e8f0fe',color:'#1e3a5f' }}>📄</div><div className="stat-info"><div className="stat-value">{fees.length}</div><div className="stat-label">Total Records</div></div></div>
      </div>

      {fees.length === 0
        ? <EmptyState icon="💳" title="No fee records" description="Your fee records will appear here" />
        : <Card title="Fee Details">
          <div className="table-wrapper">
            <table>
              <thead><tr><th>Fee Type</th><th>Total</th><th>Paid</th><th>Due</th><th>Status</th><th>Due Date</th></tr></thead>
              <tbody>
                {fees.map(fee => (
                  <tr key={fee._id}>
                    <td style={{ fontWeight: 500 }}>{fee.feeType?.replace(/_/g, ' ') || 'Fee'}</td>
                    <td>₹{(fee.totalAmount || 0).toLocaleString('en-IN')}</td>
                    <td style={{ color: 'var(--success)' }}>₹{(fee.paidAmount || 0).toLocaleString('en-IN')}</td>
                    <td style={{ color: 'var(--danger)', fontWeight: fee.dueAmount > 0 ? 600 : 400 }}>₹{(fee.dueAmount || 0).toLocaleString('en-IN')}</td>
                    <td><span className={`badge badge-${STATUS_COLOR[fee.status] || 'gray'}`}>{fee.status}</span></td>
                    <td style={{ color: fee.status === 'overdue' ? 'var(--danger)' : undefined }}>
                      {fee.dueDate ? new Date(fee.dueDate).toLocaleDateString('en-IN') : '—'}
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
