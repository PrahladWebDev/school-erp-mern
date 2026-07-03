import React, { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import { useParams } from 'react-router-dom';
import { feesAPI, studentAPI } from '../../api';
import { Card, PageLoader, SearchInput, Modal } from '../../components/common';
import toast from 'react-hot-toast';

export default function FeeCollectionPage() {
  const { school } = useSelector(s => s.auth);
  const { studentId: paramStudentId } = useParams();
  const [search, setSearch] = useState('');
  const [student, setStudent] = useState(null);
  const [fees, setFees] = useState([]);
  const [searching, setSearching] = useState(false);
  const [collectModal, setCollectModal] = useState(null);
  const [collectForm, setCollectForm] = useState({ amount: '', paymentMode: 'cash', transactionId: '', remarks: '' });
  const [saving, setSaving] = useState(false);

  // Pre-load when navigated with a studentId param
  useEffect(() => {
    if (!paramStudentId) return;
    setSearching(true);
    Promise.all([
      studentAPI.getById(paramStudentId),
      feesAPI.getStudentFees(paramStudentId, { academicYear: school?.currentAcademicYear })
    ])
      .then(([sRes, fRes]) => {
        setStudent(sRes.data.data.student);
        setFees(fRes.data.data.fees || []);
      })
      .catch(() => toast.error('Failed to load student'))
      .finally(() => setSearching(false));
  }, [paramStudentId, school]);

  const handleSearch = async () => {
    if (!search.trim()) return;
    setSearching(true);
    try {
      const { data } = await studentAPI.getAll({ search, limit: 5, status: 'active' });
      const students = data.data.students || [];
      if (students.length === 0) return toast.error('No student found');
      const s = students[0];
      setStudent(s);
      const feesRes = await feesAPI.getStudentFees(s._id, { academicYear: school?.currentAcademicYear });
      setFees(feesRes.data.data.fees || []);
    } catch { toast.error('Search failed'); }
    finally { setSearching(false); }
  };

  const openCollect = (fee) => {
    setCollectModal(fee);
    setCollectForm({ amount: fee.dueAmount.toString(), paymentMode: 'cash', transactionId: '', remarks: '' });
  };

  const handleCollect = async () => {
    if (!collectForm.amount || parseFloat(collectForm.amount) <= 0) return toast.error('Enter valid amount');
    setSaving(true);
    try {
      await feesAPI.collectPayment(collectModal._id, {
        amount: parseFloat(collectForm.amount),
        paymentMode: collectForm.paymentMode,
        transactionId: collectForm.transactionId,
        remarks: collectForm.remarks
      });
      toast.success('Payment collected!');
      setCollectModal(null);
      // Refresh fees
      const feesRes = await feesAPI.getStudentFees(student._id);
      setFees(feesRes.data.data.fees || []);
    } catch (err) { toast.error(err.response?.data?.message || 'Failed'); }
    finally { setSaving(false); }
  };

  const STATUS_COLOR = { paid: 'success', partial: 'warning', pending: 'danger', overdue: 'danger' };

  return (
    <div>
      <div className="page-header">
        <div className="page-header-left"><h1>Collect Fee</h1></div>
      </div>

      <Card title="Search Student">
        <div style={{ display: 'flex', gap: 12 }}>
          <div style={{ flex: 1 }}>
            <SearchInput value={search} onChange={setSearch} placeholder="Search by name, admission number, or mobile..." />
          </div>
          <button className="btn btn-primary" onClick={handleSearch} disabled={searching}>
            {searching ? 'Searching...' : 'Search'}
          </button>
        </div>
      </Card>

      {student && (
        <>
          <Card title="Student Details" className="mt-4">
            <div style={{ display: 'flex', gap: 32 }}>
              <div>
                <div style={{ fontWeight: 700, fontSize: '1.1rem' }}>{student.firstName} {student.lastName}</div>
                <div style={{ color: 'var(--gray-500)', fontSize: '0.875rem' }}>Adm. No: {student.admissionNumber}</div>
              </div>
              <div>
                <div style={{ fontSize: '0.875rem' }}>Class: <strong>{student.class?.name}{student.section ? ` - ${student.section}` : ''}</strong></div>
                <div style={{ fontSize: '0.875rem' }}>Guardian: <strong>{student.guardians?.[0]?.name}</strong></div>
              </div>
            </div>
          </Card>

          <Card title="Fee Records" className="mt-4">
            {fees.length === 0
              ? <p style={{ color: 'var(--gray-400)', textAlign: 'center', padding: 24 }}>No fee records found</p>
              : <div className="table-wrapper">
                <table>
                  <thead><tr><th>Fee Type</th><th>Total</th><th>Paid</th><th>Due</th><th>Status</th><th>Due Date</th><th></th></tr></thead>
                  <tbody>
                    {fees.map(fee => (
                      <tr key={fee._id}>
                        <td style={{ fontWeight: 500, textTransform: 'capitalize' }}>{fee.feeType?.replace(/_/g, ' ')}</td>
                        <td>₹{(fee.totalAmount || 0).toLocaleString('en-IN')}</td>
                        <td style={{ color: 'var(--success)' }}>₹{(fee.paidAmount || 0).toLocaleString('en-IN')}</td>
                        <td style={{ color: 'var(--danger)', fontWeight: fee.dueAmount > 0 ? 600 : 400 }}>₹{(fee.dueAmount || 0).toLocaleString('en-IN')}</td>
                        <td><span className={`badge badge-${STATUS_COLOR[fee.status] || 'gray'}`}>{fee.status}</span></td>
                        <td>{fee.dueDate ? new Date(fee.dueDate).toLocaleDateString('en-IN') : '—'}</td>
                        <td>
                          {fee.dueAmount > 0 && (
                            <button className="btn btn-primary btn-sm" onClick={() => openCollect(fee)}>Collect</button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            }
          </Card>
        </>
      )}

      <Modal isOpen={!!collectModal} onClose={() => setCollectModal(null)} title="Collect Payment"
        footer={<><button className="btn btn-ghost" onClick={() => setCollectModal(null)}>Cancel</button><button className="btn btn-primary" onClick={handleCollect} disabled={saving}>{saving ? 'Processing...' : 'Collect'}</button></>}>
        <div className="form-grid">
          <div className="form-group" style={{ gridColumn: '1/-1' }}>
            <label className="form-label">Amount (₹) *</label>
            <input className="form-input" type="number" min="0" max={collectModal?.dueAmount}
              value={collectForm.amount} onChange={e => setCollectForm(f => ({ ...f, amount: e.target.value }))} />
            {collectModal && <div style={{ fontSize: '0.8rem', color: 'var(--gray-400)', marginTop: 4 }}>Due: ₹{collectModal.dueAmount?.toLocaleString('en-IN')}</div>}
          </div>
          <div className="form-group">
            <label className="form-label">Payment Mode</label>
            <select className="form-select" value={collectForm.paymentMode} onChange={e => setCollectForm(f => ({ ...f, paymentMode: e.target.value }))}>
              {['cash', 'online', 'cheque', 'dd', 'upi'].map(m => <option key={m} value={m} style={{ textTransform: 'capitalize' }}>{m.toUpperCase()}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Transaction ID</label>
            <input className="form-input" value={collectForm.transactionId} onChange={e => setCollectForm(f => ({ ...f, transactionId: e.target.value }))} placeholder="Optional" />
          </div>
          <div className="form-group" style={{ gridColumn: '1/-1' }}>
            <label className="form-label">Remarks</label>
            <input className="form-input" value={collectForm.remarks} onChange={e => setCollectForm(f => ({ ...f, remarks: e.target.value }))} placeholder="Optional" />
          </div>
        </div>
      </Modal>
    </div>
  );
}
