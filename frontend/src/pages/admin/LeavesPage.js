import React, { useEffect, useState } from 'react';
import { leaveAPI } from '../../api';
import { Card, PageLoader, EmptyState, Tabs } from '../../components/common';
import toast from 'react-hot-toast';

export default function LeavesPage() {
  const [leaves, setLeaves] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('pending');
  const [rejectModal, setRejectModal] = useState(null);
  const [rejectReason, setRejectReason] = useState('');

  const load = async () => {
    setLoading(true);
    try {
      const { data } = await leaveAPI.getAll({ status: tab, limit: 50 });
      setLeaves(data.data.leaves || []);
    } catch { toast.error('Failed to load leaves'); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [tab]);

  const handleApprove = async (id) => {
    try {
      await leaveAPI.approve(id, { status: 'approved', remarks: '' });
      toast.success('Leave approved');
      load();
    } catch { toast.error('Failed to approve'); }
  };

  const handleReject = async () => {
    if (!rejectReason.trim()) return toast.error('Please enter rejection reason');
    try {
      await leaveAPI.approve(rejectModal, { status: 'rejected', rejectionReason: rejectReason });
      toast.success('Leave rejected');
      setRejectModal(null);
      setRejectReason('');
      load();
    } catch { toast.error('Failed to reject'); }
  };

  const STATUS_COLOR = { pending: 'warning', approved: 'success', rejected: 'danger', cancelled: 'gray' };
  const TABS = [
    { key: 'pending', label: '⏳ Pending' },
    { key: 'approved', label: '✅ Approved' },
    { key: 'rejected', label: '❌ Rejected' },
  ];

  return (
    <div>
      <div className="page-header">
        <div className="page-header-left">
          <h1>Leave Management</h1>
          <p>Review and approve leave applications</p>
        </div>
      </div>

      <div className="mb-4"><Tabs tabs={TABS} activeTab={tab} onTab={t => setTab(t)} /></div>

      {loading ? <PageLoader />
        : leaves.length === 0
          ? <EmptyState icon="📋" title={`No ${tab} leaves`} description="Leave applications will appear here" />
          : <Card title={`${tab.charAt(0).toUpperCase() + tab.slice(1)} Leaves (${leaves.length})`}>
            <div className="table-wrapper"><table>
              <thead>
                <tr>
                  <th>Applicant</th>
                  <th>Type</th>
                  <th>From</th>
                  <th>To</th>
                  <th>Days</th>
                  <th>Reason</th>
                  <th>Status</th>
                  <th>Approved / Rejected By</th>
                  {tab === 'pending' && <th>Actions</th>}
                </tr>
              </thead>
              <tbody>
                {leaves.map(lv => {
                  const days = Math.ceil((new Date(lv.toDate) - new Date(lv.fromDate)) / (1000 * 60 * 60 * 24)) + 1;
                  const approverInfo = lv.approvedBy
                    ? (lv.approvedByName || `ID: ${lv.approvedBy}`)
                    : '—';
                  const approvedTime = lv.approvedAt
                    ? new Date(lv.approvedAt).toLocaleDateString('en-IN')
                    : '';
                  return (
                    <tr key={lv._id}>
                      <td style={{ fontWeight: 500 }}>
                        {lv.applicantName || lv.applicantId || '—'}
                        <br />
                        <span style={{ fontSize: '0.75rem', color: 'var(--gray-400)', textTransform: 'capitalize' }}>
                          {lv.applicantType}
                        </span>
                      </td>
                      <td style={{ textTransform: 'capitalize' }}>{lv.leaveType}</td>
                      <td>{new Date(lv.fromDate).toLocaleDateString('en-IN')}</td>
                      <td>{new Date(lv.toDate).toLocaleDateString('en-IN')}</td>
                      <td>{days}</td>
                      <td style={{ maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={lv.reason}>
                        {lv.reason}
                      </td>
                      <td><span className={`badge badge-${STATUS_COLOR[lv.status] || 'gray'}`}>{lv.status}</span></td>
                      <td style={{ fontSize: '0.82rem' }}>
                        {lv.status === 'pending' ? (
                          <span style={{ color: 'var(--gray-400)' }}>Awaiting</span>
                        ) : (
                          <span>
                            <strong>{approverInfo}</strong>
                            {approvedTime && <><br /><span style={{ color: 'var(--gray-400)' }}>{approvedTime}</span></>}
                            {lv.rejectionReason && (
                              <><br /><span style={{ color: 'var(--danger)', fontSize: '0.75rem' }}>Reason: {lv.rejectionReason}</span></>
                            )}
                          </span>
                        )}
                      </td>
                      {tab === 'pending' && (
                        <td style={{ display: 'flex', gap: 8, minWidth: 160 }}>
                          <button className="btn btn-primary btn-sm" onClick={() => handleApprove(lv._id)}>
                            ✅ Approve
                          </button>
                          <button className="btn btn-danger btn-sm" onClick={() => { setRejectModal(lv._id); setRejectReason(''); }}>
                            ❌ Reject
                          </button>
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table></div>
          </Card>
      }

      {/* Reject Modal */}
      {rejectModal && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 1000,
          display: 'flex', alignItems: 'center', justifyContent: 'center'
        }}>
          <div style={{ background: 'var(--bg-card)', borderRadius: 12, padding: 24, width: 400, maxWidth: '90vw' }}>
            <h3 style={{ marginBottom: 16 }}>Reject Leave</h3>
            <div className="form-group">
              <label className="form-label">Rejection Reason <span className="required">*</span></label>
              <textarea className="form-input" rows={3}
                value={rejectReason}
                onChange={e => setRejectReason(e.target.value)}
                placeholder="Enter reason for rejection..."
                style={{ resize: 'vertical' }}
              />
            </div>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 16 }}>
              <button className="btn btn-ghost" onClick={() => setRejectModal(null)}>Cancel</button>
              <button className="btn btn-danger" onClick={handleReject}>Confirm Reject</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
