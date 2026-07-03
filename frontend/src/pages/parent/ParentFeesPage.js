import React, { useEffect, useState } from 'react';
import { feesAPI, parentAPI } from '../../api';
import { Card, PageLoader, EmptyState } from '../../components/common';
import toast from 'react-hot-toast';

export default function ParentFeesPage() {
  const [fees, setFees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [childName, setChildName] = useState('');

  useEffect(() => {
    const load = async () => {
      try {
        // Fetch parent's children first, then get fees for first child
        const childrenRes = await parentAPI.getChildren();
        const children = childrenRes.data.data.children || [];
        if (children.length === 0) {
          setLoading(false);
          return;
        }
        const child = children[0];
        setChildName(child.firstName ? `${child.firstName} ${child.lastName || ''}`.trim() : '');
        const feesRes = await feesAPI.getStudentFees(child._id);
        setFees(feesRes.data.data.fees || []);
      } catch {
        toast.error('Failed to load fees');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  if (loading) return <PageLoader />;

  const totalDue = fees.reduce((s, f) => s + (f.dueAmount || 0), 0);
  const totalPaid = fees.reduce((s, f) => s + (f.paidAmount || 0), 0);
  const STATUS_COLOR = { paid: 'success', partial: 'warning', pending: 'danger', overdue: 'danger' };

  return (
    <div>
      <div className="page-header">
        <div className="page-header-left">
          <h1>Fee Status</h1>
          {childName && <p>{childName}</p>}
        </div>
      </div>
      <div className="grid-3 mb-5">
        <div className="stat-card"><div className="stat-icon" style={{ background:'#f0fdf4',color:'#16a34a' }}>✅</div><div className="stat-info"><div className="stat-value">₹{totalPaid.toLocaleString('en-IN')}</div><div className="stat-label">Paid</div></div></div>
        <div className="stat-card"><div className="stat-icon" style={{ background:'#fef2f2',color:'#dc2626' }}>💳</div><div className="stat-info"><div className="stat-value">₹{totalDue.toLocaleString('en-IN')}</div><div className="stat-label">Due</div></div></div>
        <div className="stat-card"><div className="stat-icon" style={{ background:'#e8f0fe',color:'#1e3a5f' }}>📄</div><div className="stat-info"><div className="stat-value">{fees.length}</div><div className="stat-label">Records</div></div></div>
      </div>
      {fees.length === 0
        ? <EmptyState icon="💳" title="No fee records" description="No fees have been assigned yet." />
        : <Card title="Fee Details">
          <div className="table-wrapper"><table>
            <thead><tr><th>Fee Type</th><th>Total</th><th>Paid</th><th>Due</th><th>Status</th><th>Due Date</th></tr></thead>
            <tbody>
              {fees.map(fee => (
                <tr key={fee._id}>
                  <td style={{ fontWeight: 500 }}>{fee.feeType?.replace(/_/g, ' ') || 'Fee'}</td>
                  <td>₹{(fee.totalAmount || 0).toLocaleString('en-IN')}</td>
                  <td style={{ color: 'var(--success)' }}>₹{(fee.paidAmount || 0).toLocaleString('en-IN')}</td>
                  <td style={{ color: 'var(--danger)', fontWeight: fee.dueAmount > 0 ? 600 : 400 }}>₹{(fee.dueAmount || 0).toLocaleString('en-IN')}</td>
                  <td><span className={`badge badge-${STATUS_COLOR[fee.status] || 'gray'}`}>{fee.status}</span></td>
                  <td>{fee.dueDate ? new Date(fee.dueDate).toLocaleDateString('en-IN') : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table></div>
        </Card>
      }
    </div>
  );
}
