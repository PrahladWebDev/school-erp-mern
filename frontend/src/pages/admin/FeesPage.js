import React, { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import { feesAPI, studentAPI, classAPI } from '../../api';
import { Card, PageLoader, SearchInput, Pagination, Modal, Tabs } from '../../components/common';
import toast from 'react-hot-toast';

const PAYMENT_MODES = ['cash', 'upi', 'cheque', 'online', 'dd'];
const FEE_TYPES = ['tuition_fee','admission_fee','exam_fee','sports_fee','library_fee','lab_fee','transport_fee','hostel_fee','computer_fee','activity_fee','other'];

export default function FeesPage() {
  const { school, user } = useSelector(s => s.auth);
  const [tab, setTab] = useState('pending');
  const [pending, setPending] = useState([]);
  const [structures, setStructures] = useState([]);
  const [pagination, setPagination] = useState({});
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [classes, setClasses] = useState([]);

  // Collect modal
  const [collectModal, setCollectModal] = useState(null);
  const [collectForm, setCollectForm] = useState({ amount:'', paymentMode:'cash', transactionId:'', remarks:'' });
  const [saving, setSaving] = useState(false);

  // Create fee structure modal
  const [structureModal, setStructureModal] = useState(false);
  const [structForm, setStructForm] = useState({
    name:'', academicYear:'', classId:'', applicableTo:'all',
    feeItems:[{ feeType:'tuition_fee', label:'Tuition Fee', amount:'', frequency:'yearly' }]
  });
  const [structSaving, setStructSaving] = useState(false);

  // Assign fee to student modal
  const [assignModal, setAssignModal] = useState(false);
  const [assignForm, setAssignForm] = useState({ studentId:'', feeStructureId:'', discount:0, dueDate:'' });
  const [assignSaving, setAssignSaving] = useState(false);
  const [studentQuery, setStudentQuery] = useState('');
  const [studentResults, setStudentResults] = useState([]);
  const [searchingStudent, setSearchingStudent] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState(null);

  const loadPending = async () => {
    setLoading(true);
    try {
      const { data } = await feesAPI.getPendingFees({ academicYear: school?.currentAcademicYear, page, limit: 20 });
      setPending(data.data.fees || []);
      setPagination(data.data.pagination || {});
    } catch { toast.error('Failed to load fees'); }
    finally { setLoading(false); }
  };

  const loadStructures = async () => {
    setLoading(true);
    try {
      const { data } = await feesAPI.getStructures({ academicYear: school?.currentAcademicYear });
      setStructures(data.data.structures || []);
    } catch { toast.error('Failed to load fee structures'); }
    finally { setLoading(false); }
  };

  useEffect(() => {
    classAPI.getAll({}).then(r => setClasses(r.data.data.classes || []));
    setStructForm(f => ({ ...f, academicYear: school?.currentAcademicYear || '' }));
  }, [school]);

  useEffect(() => {
    if (tab === 'pending') loadPending();
    if (tab === 'structures') loadStructures();
  }, [tab, page, school]);

  // Debounced student search for the Assign Fee modal
  useEffect(() => {
    if (!assignModal || selectedStudent || !studentQuery.trim()) {
      setStudentResults([]);
      return;
    }
    setSearchingStudent(true);
    const timer = setTimeout(() => {
      studentAPI.getAll({ search: studentQuery.trim(), limit: 8, status: 'active' })
        .then(r => setStudentResults(r.data.data.students || []))
        .catch(() => setStudentResults([]))
        .finally(() => setSearchingStudent(false));
    }, 350);
    return () => clearTimeout(timer);
  }, [studentQuery, assignModal, selectedStudent]);

  const selectStudent = (s) => {
    setSelectedStudent(s);
    setAssignForm(f => ({ ...f, studentId: s._id }));
    setStudentQuery('');
    setStudentResults([]);
  };

  const clearSelectedStudent = () => {
    setSelectedStudent(null);
    setAssignForm(f => ({ ...f, studentId: '' }));
    setStudentQuery('');
  };

  const closeAssignModal = () => {
    setAssignModal(false);
    setAssignForm({ studentId:'', feeStructureId:'', discount:0, dueDate:'' });
    setSelectedStudent(null);
    setStudentQuery('');
    setStudentResults([]);
  };

  const openCollect = (fee) => {
    setCollectModal(fee);
    setCollectForm({ amount: fee.dueAmount.toString(), paymentMode:'cash', transactionId:'', remarks:'' });
  };

  const handleCollect = async () => {
    if (!collectForm.amount || parseFloat(collectForm.amount) <= 0) return toast.error('Enter valid amount');
    setSaving(true);
    try {
      await feesAPI.collectPayment(collectModal._id, {
        amount: parseFloat(collectForm.amount),
        paymentMode: collectForm.paymentMode,
        transactionId: collectForm.transactionId,
        remarks: collectForm.remarks,
      });
      toast.success('Payment collected!');
      setCollectModal(null);
      loadPending();
    } catch (err) { toast.error(err.response?.data?.message || 'Payment failed'); }
    finally { setSaving(false); }
  };

  const handleCreateStructure = async () => {
    if (!structForm.name) return toast.error('Fee structure name required');
    if (structForm.feeItems.some(i => !i.amount || parseFloat(i.amount) <= 0)) return toast.error('All fee items need valid amounts');
    setStructSaving(true);
    try {
      await feesAPI.createStructure({
        ...structForm,
        feeItems: structForm.feeItems.map(i => ({ ...i, amount: parseFloat(i.amount) }))
      });
      toast.success('Fee structure created!');
      setStructureModal(false);
      loadStructures();
    } catch (err) { toast.error(err.response?.data?.message || 'Failed to create'); }
    finally { setStructSaving(false); }
  };

  const handleAssign = async () => {
    if (!assignForm.studentId || !assignForm.feeStructureId) return toast.error('Select student and fee structure');
    setAssignSaving(true);
    try {
      await feesAPI.assignToStudent(assignForm);
      toast.success('Fee assigned to student!');
      closeAssignModal();
      if (tab === 'pending') loadPending();
    } catch (err) { toast.error(err.response?.data?.message || 'Failed to assign'); }
    finally { setAssignSaving(false); }
  };

  const addFeeItem = () => setStructForm(f => ({
    ...f, feeItems: [...f.feeItems, { feeType:'other', label:'', amount:'', frequency:'yearly' }]
  }));
  const setFeeItem = (i, key, val) => setStructForm(f => {
    const items = [...f.feeItems]; items[i] = { ...items[i], [key]: val };
    return { ...f, feeItems: items };
  });
  const removeFeeItem = (i) => setStructForm(f => ({ ...f, feeItems: f.feeItems.filter((_,j)=>j!==i) }));

  const STATUS_COLOR = { pending:'warning', partial:'info', overdue:'danger', paid:'success' };
  const TABS = [
    { key: 'pending', label: '💰 Pending Fees' },
    { key: 'structures', label: '📋 Fee Structures' },
  ];

  const filteredPending = pending.filter(f =>
    !search || f.studentName?.toLowerCase().includes(search.toLowerCase()) ||
    f.admissionNumber?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div>
      <div className="page-header">
        <div className="page-header-left">
          <h1>Fee Management</h1>
          <p>Collect fees, create structures, and track payments</p>
        </div>
        <div style={{ display:'flex', gap:8 }}>
          <button className="btn btn-outline" onClick={() => setAssignModal(true)}>+ Assign Fee to Student</button>
          <button className="btn btn-primary" onClick={() => setStructureModal(true)}>+ Create Fee Structure</button>
        </div>
      </div>

      <div className="mb-4"><Tabs tabs={TABS} activeTab={tab} onTab={t => { setTab(t); setPage(1); }} /></div>

      {loading ? <PageLoader /> : tab === 'pending' ? (
        <Card title={`Pending Fee Collection (${pagination.total || pending.length})`}>
          <div className="filter-bar mb-4">
            <SearchInput value={search} onChange={setSearch} placeholder="Search by student name or admission no..." />
          </div>
          <div className="table-wrapper">
            <table>
              <thead><tr>
                <th>Student</th><th>Class</th><th>Fee Type</th>
                <th>Total</th><th>Paid</th><th>Due</th>
                <th>Status</th><th>Due Date</th><th>Action</th>
              </tr></thead>
              <tbody>
                {filteredPending.map(fee => (
                  <tr key={fee._id}>
                    <td>
                      <div style={{ fontWeight:500 }}>{fee.studentName}</div>
                      <div style={{ fontSize:'0.75rem', color:'var(--gray-400)' }}>{fee.admissionNumber}</div>
                    </td>
                    <td>{fee.className}{fee.section ? ` / ${fee.section}` : ''}</td>
                    <td style={{ fontSize:'0.85rem' }}>{fee.feeLabel || fee.feeType}</td>
                    <td style={{ fontWeight:600 }}>₹{fee.totalAmount?.toLocaleString('en-IN')}</td>
                    <td style={{ color:'var(--success)', fontWeight:500 }}>₹{fee.paidAmount?.toLocaleString('en-IN')}</td>
                    <td style={{ color:'var(--danger)', fontWeight:600 }}>₹{fee.dueAmount?.toLocaleString('en-IN')}</td>
                    <td><span className={`badge badge-${STATUS_COLOR[fee.status] || 'gray'}`}>{fee.status}</span></td>
                    <td style={{ fontSize:'0.82rem', color: fee.status === 'overdue' ? 'var(--danger)' : 'inherit' }}>
                      {fee.dueDate ? new Date(fee.dueDate).toLocaleDateString('en-IN') : '—'}
                    </td>
                    <td>
                      <button className="btn btn-primary btn-sm" onClick={() => openCollect(fee)}>💰 Collect</button>
                    </td>
                  </tr>
                ))}
                {filteredPending.length === 0 && (
                  <tr><td colSpan={9} style={{ textAlign:'center', color:'var(--gray-400)', padding:32 }}>
                    🎉 No pending fees found!
                  </td></tr>
                )}
              </tbody>
            </table>
          </div>
          <Pagination page={page} pages={pagination.pages} onPage={setPage} />
        </Card>
      ) : (
        <Card title={`Fee Structures (${structures.length})`}>
          <div className="table-wrapper">
            <table>
              <thead><tr>
                <th>Name</th><th>Academic Year</th><th>Class</th>
                <th>Total Amount</th><th>Fee Items</th>
                <th>Created By</th><th>Created On</th><th>Status</th>
              </tr></thead>
              <tbody>
                {structures.map(s => (
                  <tr key={s._id}>
                    <td style={{ fontWeight:500 }}>{s.name}</td>
                    <td>{s.academicYear}</td>
                    <td>{s.classId?.name || (s.applicableTo === 'all' ? 'All Classes' : '—')}</td>
                    <td style={{ fontWeight:600, color:'var(--primary)' }}>₹{s.totalAmount?.toLocaleString('en-IN')}</td>
                    <td>
                      {s.feeItems?.map((item, i) => (
                        <div key={i} style={{ fontSize:'0.78rem', color:'var(--gray-500)' }}>
                          {item.label}: ₹{item.amount?.toLocaleString('en-IN')}
                        </div>
                      ))}
                    </td>
                    <td style={{ fontSize:'0.82rem' }}>
                      <strong>{s.createdByName || '—'}</strong>
                      {s.createdByRole && (
                        <div style={{ fontSize:'0.72rem', color:'var(--gray-400)', textTransform:'capitalize' }}>{s.createdByRole}</div>
                      )}
                    </td>
                    <td style={{ fontSize:'0.82rem' }}>
                      {s.createdAt ? new Date(s.createdAt).toLocaleDateString('en-IN') : '—'}
                    </td>
                    <td>
                      <span className={`badge badge-${s.isActive ? 'success' : 'gray'}`}>
                        {s.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                  </tr>
                ))}
                {structures.length === 0 && (
                  <tr><td colSpan={8} style={{ textAlign:'center', color:'var(--gray-400)', padding:32 }}>
                    No fee structures created yet. Click "+ Create Fee Structure" to add one.
                  </td></tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Collect Modal */}
      <Modal isOpen={!!collectModal} onClose={() => setCollectModal(null)}
        title={`Collect Fee — ${collectModal?.studentName}`}
        footer={<>
          <button className="btn btn-ghost" onClick={() => setCollectModal(null)}>Cancel</button>
          <button className="btn btn-primary" onClick={handleCollect} disabled={saving}>
            {saving ? 'Processing...' : '💰 Confirm Payment'}
          </button>
        </>}
      >
        {collectModal && (
          <div>
            <div style={{ background:'var(--gray-50)', borderRadius:8, padding:12, marginBottom:16 }}>
              <div style={{ display:'flex', justifyContent:'space-between', marginBottom:4 }}>
                <span style={{ color:'var(--gray-500)', fontSize:'0.875rem' }}>Total Amount</span>
                <span style={{ fontWeight:600 }}>₹{collectModal.totalAmount?.toLocaleString('en-IN')}</span>
              </div>
              <div style={{ display:'flex', justifyContent:'space-between', marginBottom:4 }}>
                <span style={{ color:'var(--gray-500)', fontSize:'0.875rem' }}>Already Paid</span>
                <span style={{ fontWeight:600, color:'var(--success)' }}>₹{collectModal.paidAmount?.toLocaleString('en-IN')}</span>
              </div>
              <div style={{ display:'flex', justifyContent:'space-between' }}>
                <span style={{ color:'var(--gray-500)', fontSize:'0.875rem' }}>Balance Due</span>
                <span style={{ fontWeight:700, color:'var(--danger)', fontSize:'1.1rem' }}>₹{collectModal.dueAmount?.toLocaleString('en-IN')}</span>
              </div>
            </div>
            <div className="form-grid-2">
              <div className="form-group">
                <label className="form-label">Amount <span className="required">*</span></label>
                <input className="form-input" type="number" min="1" max={collectModal.dueAmount}
                  value={collectForm.amount} onChange={e => setCollectForm(f => ({ ...f, amount: e.target.value }))} />
              </div>
              <div className="form-group">
                <label className="form-label">Payment Mode <span className="required">*</span></label>
                <select className="form-select" value={collectForm.paymentMode}
                  onChange={e => setCollectForm(f => ({ ...f, paymentMode: e.target.value }))}>
                  {PAYMENT_MODES.map(m => <option key={m} value={m} style={{ textTransform:'capitalize' }}>{m.toUpperCase()}</option>)}
                </select>
              </div>
            </div>
            {collectForm.paymentMode !== 'cash' && (
              <div className="form-group">
                <label className="form-label">Transaction ID / Cheque No.</label>
                <input className="form-input" value={collectForm.transactionId}
                  onChange={e => setCollectForm(f => ({ ...f, transactionId: e.target.value }))} />
              </div>
            )}
            <div className="form-group">
              <label className="form-label">Remarks</label>
              <input className="form-input" value={collectForm.remarks}
                onChange={e => setCollectForm(f => ({ ...f, remarks: e.target.value }))} placeholder="Optional note" />
            </div>
          </div>
        )}
      </Modal>

      {/* Create Fee Structure Modal */}
      <Modal isOpen={structureModal} onClose={() => setStructureModal(false)} title="Create Fee Structure" size="modal-lg"
        footer={<>
          <button className="btn btn-ghost" onClick={() => setStructureModal(false)}>Cancel</button>
          <button className="btn btn-primary" onClick={handleCreateStructure} disabled={structSaving}>
            {structSaving ? 'Creating...' : 'Create Structure'}
          </button>
        </>}
      >
        <div className="form-grid-2">
          <div className="form-group">
            <label className="form-label">Structure Name <span className="required">*</span></label>
            <input className="form-input" value={structForm.name}
              onChange={e => setStructForm(f => ({ ...f, name: e.target.value }))}
              placeholder="e.g. Annual Fee 2024-25" />
          </div>
          <div className="form-group">
            <label className="form-label">Academic Year</label>
            <input className="form-input" value={structForm.academicYear}
              onChange={e => setStructForm(f => ({ ...f, academicYear: e.target.value }))} />
          </div>
          <div className="form-group">
            <label className="form-label">Applicable To</label>
            <select className="form-select" value={structForm.applicableTo}
              onChange={e => setStructForm(f => ({ ...f, applicableTo: e.target.value }))}>
              <option value="all">All Students</option>
              <option value="class">Specific Class</option>
            </select>
          </div>
          {structForm.applicableTo === 'class' && (
            <div className="form-group">
              <label className="form-label">Class</label>
              <select className="form-select" value={structForm.classId}
                onChange={e => setStructForm(f => ({ ...f, classId: e.target.value }))}>
                <option value="">Select Class</option>
                {classes.map(c => <option key={c._id} value={c._id}>{c.name}</option>)}
              </select>
            </div>
          )}
        </div>

        <div style={{ marginTop: 20 }}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:12 }}>
            <h4 style={{ fontSize:'0.9rem' }}>Fee Items</h4>
            <button type="button" className="btn btn-ghost btn-sm" onClick={addFeeItem}>+ Add Item</button>
          </div>
          {structForm.feeItems.map((item, i) => (
            <div key={i} style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr 1fr auto', gap:8, marginBottom:8, alignItems:'end' }}>
              <div className="form-group" style={{ margin:0 }}>
                {i===0 && <label className="form-label">Type</label>}
                <select className="form-select" value={item.feeType} onChange={e => setFeeItem(i,'feeType',e.target.value)}>
                  {FEE_TYPES.map(t => <option key={t} value={t}>{t.replace('_',' ')}</option>)}
                </select>
              </div>
              <div className="form-group" style={{ margin:0 }}>
                {i===0 && <label className="form-label">Label</label>}
                <input className="form-input" value={item.label} onChange={e => setFeeItem(i,'label',e.target.value)} placeholder="e.g. Tuition Fee" />
              </div>
              <div className="form-group" style={{ margin:0 }}>
                {i===0 && <label className="form-label">Amount (₹)</label>}
                <input className="form-input" type="number" value={item.amount} onChange={e => setFeeItem(i,'amount',e.target.value)} placeholder="0" />
              </div>
              <div className="form-group" style={{ margin:0 }}>
                {i===0 && <label className="form-label">Frequency</label>}
                <select className="form-select" value={item.frequency} onChange={e => setFeeItem(i,'frequency',e.target.value)}>
                  <option value="yearly">Yearly</option>
                  <option value="monthly">Monthly</option>
                  <option value="quarterly">Quarterly</option>
                  <option value="one_time">One Time</option>
                </select>
              </div>
              <button type="button"
                style={{ background:'none', border:'none', color:'var(--danger)', cursor:'pointer', fontSize:'1.1rem', paddingBottom: i===0?0:4 }}
                onClick={() => removeFeeItem(i)} disabled={structForm.feeItems.length <= 1}>✕</button>
            </div>
          ))}
          <div style={{ marginTop:8, fontSize:'0.85rem', color:'var(--gray-400)' }}>
            Total: ₹{structForm.feeItems.reduce((s,i)=>s+(parseFloat(i.amount)||0),0).toLocaleString('en-IN')}
          </div>
        </div>
      </Modal>

      {/* Assign Fee Modal */}
      <Modal isOpen={assignModal} onClose={closeAssignModal} title="Assign Fee to Student"
        footer={<>
          <button className="btn btn-ghost" onClick={closeAssignModal}>Cancel</button>
          <button className="btn btn-primary" onClick={handleAssign} disabled={assignSaving}>
            {assignSaving ? 'Assigning...' : 'Assign Fee'}
          </button>
        </>}
      >
        <div className="form-group" style={{ position:'relative' }}>
          <label className="form-label">Student <span className="required">*</span></label>
          {selectedStudent ? (
            <div style={{
              display:'flex', justifyContent:'space-between', alignItems:'center',
              border:'1px solid var(--gray-200)', borderRadius:8, padding:'8px 12px', background:'var(--gray-50)'
            }}>
              <div>
                <div style={{ fontWeight:600, fontSize:'0.9rem' }}>
                  {selectedStudent.firstName} {selectedStudent.lastName || ''}
                </div>
                <div style={{ fontSize:'0.75rem', color:'var(--gray-400)' }}>
                  {selectedStudent.admissionNumber} &bull; {selectedStudent.class?.name}{selectedStudent.section ? ` - ${selectedStudent.section}` : ''}
                </div>
              </div>
              <button type="button" className="btn btn-ghost btn-sm" onClick={clearSelectedStudent}>Change</button>
            </div>
          ) : (
            <>
              <input className="form-input" value={studentQuery}
                onChange={e => setStudentQuery(e.target.value)}
                placeholder="Search by student name or admission no..." autoComplete="off" />
              {studentQuery.trim() && (
                <div style={{
                  position:'absolute', top:'100%', left:0, right:0, zIndex:10,
                  background:'#fff', border:'1px solid var(--gray-200)', borderRadius:8,
                  marginTop:4, maxHeight:220, overflowY:'auto', boxShadow:'0 4px 12px rgba(0,0,0,0.08)'
                }}>
                  {searchingStudent ? (
                    <div style={{ padding:12, fontSize:'0.85rem', color:'var(--gray-400)' }}>Searching...</div>
                  ) : studentResults.length === 0 ? (
                    <div style={{ padding:12, fontSize:'0.85rem', color:'var(--gray-400)' }}>No students found</div>
                  ) : studentResults.map(s => (
                    <div key={s._id}
                      onClick={() => selectStudent(s)}
                      style={{ padding:'8px 12px', cursor:'pointer', borderBottom:'1px solid var(--gray-100)' }}
                      onMouseEnter={e => e.currentTarget.style.background='var(--gray-50)'}
                      onMouseLeave={e => e.currentTarget.style.background='#fff'}
                    >
                      <div style={{ fontWeight:600, fontSize:'0.875rem' }}>{s.firstName} {s.lastName || ''}</div>
                      <div style={{ fontSize:'0.75rem', color:'var(--gray-400)' }}>
                        {s.admissionNumber} &bull; {s.class?.name}{s.section ? ` - ${s.section}` : ''}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
        <div className="form-group">
          <label className="form-label">Fee Structure <span className="required">*</span></label>
          <select className="form-select" value={assignForm.feeStructureId}
            onChange={e => setAssignForm(f => ({ ...f, feeStructureId: e.target.value }))}>
            <option value="">Select Fee Structure</option>
            {structures.map(s => <option key={s._id} value={s._id}>{s.name} — ₹{s.totalAmount?.toLocaleString('en-IN')}</option>)}
          </select>
        </div>
        <div className="form-grid-2">
          <div className="form-group">
            <label className="form-label">Discount (₹)</label>
            <input className="form-input" type="number" value={assignForm.discount}
              onChange={e => setAssignForm(f => ({ ...f, discount: parseFloat(e.target.value)||0 }))} />
          </div>
          <div className="form-group">
            <label className="form-label">Due Date</label>
            <input className="form-input" type="date" value={assignForm.dueDate}
              onChange={e => setAssignForm(f => ({ ...f, dueDate: e.target.value }))} />
          </div>
        </div>
      </Modal>
    </div>
  );
}
