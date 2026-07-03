import React, { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import { leaveAPI } from '../../api';
import { Card, PageLoader, EmptyState, Modal } from '../../components/common';
import toast from 'react-hot-toast';

export default function StudentLeavePage() {
  const { user } = useSelector(s => s.auth);
  const [leaves, setLeaves] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ fromDate: '', toDate: '', reason: '', leaveType: 'sick' });

  const load = async () => {
    setLoading(true);
    try {
      const { data } = await leaveAPI.getAll({ applicantType: 'student' });
      setLeaves(data.data.leaves || []);
    } catch { toast.error('Failed to load leaves'); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const handleApply = async () => {
    if (!form.fromDate || !form.toDate || !form.reason) return toast.error('Fill all fields');
    setSaving(true);
    try {
      await leaveAPI.apply({ ...form, applicantType: 'student', applicantId: user?.profileId });
      toast.success('Leave applied!');
      setModal(false);
      setForm({ fromDate: '', toDate: '', reason: '', leaveType: 'sick' });
      load();
    } catch (err) { toast.error(err.response?.data?.message || 'Failed'); }
    finally { setSaving(false); }
  };

  const STATUS_COLOR = { pending: 'warning', approved: 'success', rejected: 'danger' };

  if (loading) return <PageLoader />;

  return (
    <div>
      <div className="page-header">
        <div className="page-header-left"><h1>Apply Leave</h1></div>
        <button className="btn btn-primary" onClick={() => setModal(true)}>+ Apply Leave</button>
      </div>

      {leaves.length === 0
        ? <EmptyState icon="📋" title="No leave applications" action={<button className="btn btn-primary" onClick={() => setModal(true)}>Apply Leave</button>} />
        : <Card title="My Leave Applications">
          <div className="table-wrapper">
            <table>
              <thead><tr><th>Type</th><th>From</th><th>To</th><th>Days</th><th>Reason</th><th>Status</th></tr></thead>
              <tbody>
                {leaves.map(lv => {
                  const days = Math.ceil((new Date(lv.toDate) - new Date(lv.fromDate)) / (1000 * 60 * 60 * 24)) + 1;
                  return (
                    <tr key={lv._id}>
                      <td style={{ textTransform: 'capitalize' }}>{lv.leaveType}</td>
                      <td>{new Date(lv.fromDate).toLocaleDateString('en-IN')}</td>
                      <td>{new Date(lv.toDate).toLocaleDateString('en-IN')}</td>
                      <td>{days}</td>
                      <td style={{ maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{lv.reason}</td>
                      <td><span className={`badge badge-${STATUS_COLOR[lv.status] || 'gray'}`}>{lv.status}</span></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      }

      <Modal isOpen={modal} onClose={() => setModal(false)} title="Apply for Leave"
        footer={<><button className="btn btn-ghost" onClick={() => setModal(false)}>Cancel</button><button className="btn btn-primary" onClick={handleApply} disabled={saving}>{saving ? 'Submitting...' : 'Submit'}</button></>}>
        <div className="form-grid">
          <div className="form-group">
            <label className="form-label">Leave Type</label>
            <select className="form-select" value={form.leaveType} onChange={e => setForm(f => ({ ...f, leaveType: e.target.value }))}>
              {['sick', 'casual', 'medical', 'family', 'other'].map(t => <option key={t} value={t} style={{ textTransform: 'capitalize' }}>{t}</option>)}
            </select>
          </div>
          <div className="form-group" />
          <div className="form-group">
            <label className="form-label">From Date *</label>
            <input className="form-input" type="date" value={form.fromDate} onChange={e => setForm(f => ({ ...f, fromDate: e.target.value }))} />
          </div>
          <div className="form-group">
            <label className="form-label">To Date *</label>
            <input className="form-input" type="date" value={form.toDate} min={form.fromDate} onChange={e => setForm(f => ({ ...f, toDate: e.target.value }))} />
          </div>
          <div className="form-group" style={{ gridColumn: '1/-1' }}>
            <label className="form-label">Reason *</label>
            <textarea className="form-input" rows={3} value={form.reason} onChange={e => setForm(f => ({ ...f, reason: e.target.value }))} placeholder="Reason for leave..." />
          </div>
        </div>
      </Modal>
    </div>
  );
}
