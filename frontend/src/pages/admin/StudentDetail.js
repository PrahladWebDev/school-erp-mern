import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { studentAPI, feesAPI, examAPI } from '../../api';
import { Card, PageLoader, Tabs, ProgressBar, Modal } from '../../components/common';
import toast from 'react-hot-toast';

export default function StudentDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [student, setStudent] = useState(null);
  const [fees, setFees] = useState([]);
  const [results, setResults] = useState([]);
  const [tab, setTab] = useState('profile');
  const [loading, setLoading] = useState(true);
  const [credsModal, setCredsModal] = useState(null);
  const [resetting, setResetting] = useState(false);

  useEffect(() => {
    if (!id) return;
    Promise.all([
      studentAPI.getById(id),
      feesAPI.getStudentFees(id),
      examAPI.getResults({ studentId: id })
    ])
      .then(([sRes, fRes, rRes]) => {
        setStudent(sRes.data.data.student);
        setFees(fRes.data.data.fees || []);
        setResults(rRes.data.data.results || []);
      })
      .catch(() => toast.error('Failed to load student'))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return <PageLoader />;
  if (!student) return <div className="card" style={{ padding: 40, textAlign: 'center', color: 'var(--gray-400)' }}>Student not found</div>;

  const handleResetCredentials = async () => {
    setResetting(true);
    try {
      const { data } = await studentAPI.resetCredentials(id);
      setCredsModal(data.data);
      toast.success('Credentials reset!');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to reset credentials');
    } finally { setResetting(false); }
  };

  const TABS = [
    { key: 'profile', label: 'Profile' },
    { key: 'fees', label: `Fees (${fees.length})` },
    { key: 'results', label: `Results (${results.length})` },
  ];

  const Row = ({ label, value }) => (
    <div style={{ display: 'flex', padding: '9px 0', borderBottom: '1px solid var(--gray-100)' }}>
      <span style={{ width: 160, color: 'var(--gray-500)', fontSize: '0.875rem', flexShrink: 0 }}>{label}</span>
      <span style={{ fontWeight: 500, fontSize: '0.875rem' }}>{value || '—'}</span>
    </div>
  );

  const totalDue = fees.reduce((s, f) => s + (f.dueAmount || 0), 0);
  const STATUS_COLOR = { paid: 'success', partial: 'warning', pending: 'danger', overdue: 'danger' };

  return (
    <div>
      <div className="page-header">
        <div className="page-header-left">
          <h1>{student.firstName} {student.lastName}</h1>
          <p>Adm. No: {student.admissionNumber} · {student.class?.name}{student.section ? ` - ${student.section}` : ''}</p>
        </div>
        <div style={{ display: 'flex', gap: 12 }}>
          <button className="btn btn-ghost" onClick={() => navigate(-1)}>← Back</button>
          <button className="btn btn-ghost" onClick={handleResetCredentials} disabled={resetting}
            title="Generate new login password for this student">
            {resetting ? '⏳' : '🔑'} Reset Login
          </button>
          <button className="btn btn-outline" onClick={() => navigate('/admin/students/promote')} title="Promote this student to the next class">🎓 Promote</button>
          <button className="btn btn-primary" onClick={() => navigate(`/admin/students/${id}/edit`)}>Edit</button>
        </div>
      </div>

      <div className="mb-4"><Tabs tabs={TABS} activeTab={tab} onTab={setTab} /></div>

      {tab === 'profile' && (
        <div className="grid-2">
          <Card title="Personal Details">
            <Row label="Full Name" value={`${student.firstName} ${student.lastName || ''}`} />
            <Row label="Gender" value={student.gender} />
            <Row label="Date of Birth" value={student.dateOfBirth ? new Date(student.dateOfBirth).toLocaleDateString('en-IN') : null} />
            <Row label="Blood Group" value={student.bloodGroup} />
            <Row label="Category" value={student.category} />
            <Row label="Aadhar No." value={student.aadharNumber} />
            <Row label="Mobile" value={student.mobile} />
            <Row label="Email" value={student.email} />
            <Row label="Status" value={<span className={`badge badge-${student.status === 'active' ? 'success' : 'gray'}`}>{student.status}</span>} />
          </Card>
          <Card title="Academic Details">
            <Row label="Admission No." value={student.admissionNumber} />
            <Row label="Roll No." value={student.rollNumber} />
            <Row label="Class" value={student.class?.name} />
            <Row label="Section" value={student.section} />
            <Row label="Academic Year" value={student.academicYear} />
            <Row label="Admission Date" value={student.admissionDate ? new Date(student.admissionDate).toLocaleDateString('en-IN') : null} />
            <Row label="Previous School" value={student.previousSchool} />
            {student.guardians?.map((g, i) => (
              <div key={i}>
                <Row label={`Guardian ${i + 1}`} value={`${g.name} (${g.relation})`} />
                <Row label="Guardian Mobile" value={g.mobile} />
              </div>
            ))}
          </Card>
        </div>
      )}

      {tab === 'fees' && (
        <Card title={`Fee Records — Due: ₹${totalDue.toLocaleString('en-IN')}`}>
          {fees.length === 0
            ? <p style={{ color: 'var(--gray-400)', textAlign: 'center', padding: 24 }}>No fee records</p>
            : <div className="table-wrapper"><table>
              <thead><tr><th>Fee Type</th><th>Total</th><th>Paid</th><th>Due</th><th>Status</th><th>Due Date</th></tr></thead>
              <tbody>
                {fees.map(fee => (
                  <tr key={fee._id}>
                    <td style={{ fontWeight: 500, textTransform: 'capitalize' }}>{fee.feeType?.replace(/_/g, ' ')}</td>
                    <td>₹{(fee.totalAmount || 0).toLocaleString('en-IN')}</td>
                    <td style={{ color: 'var(--success)' }}>₹{(fee.paidAmount || 0).toLocaleString('en-IN')}</td>
                    <td style={{ color: 'var(--danger)', fontWeight: fee.dueAmount > 0 ? 600 : 400 }}>₹{(fee.dueAmount || 0).toLocaleString('en-IN')}</td>
                    <td><span className={`badge badge-${STATUS_COLOR[fee.status] || 'gray'}`}>{fee.status}</span></td>
                    <td>{fee.dueDate ? new Date(fee.dueDate).toLocaleDateString('en-IN') : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table></div>
          }
        </Card>
      )}

      {tab === 'results' && (
        results.length === 0
          ? <Card><p style={{ color: 'var(--gray-400)', textAlign: 'center', padding: 40 }}>No exam results yet</p></Card>
          : results.map(result => {
            const totalMax = result.subjectMarks?.reduce((s, m) => s + m.maxMarks, 0) || 0;
            const totalObt = result.subjectMarks?.reduce((s, m) => s + m.marksObtained, 0) || 0;
            const pct = totalMax > 0 ? Math.round((totalObt / totalMax) * 100) : 0;
            return (
              <Card key={result._id} title={result.examId?.name || 'Exam'} className="mb-4">
                <div style={{ display: 'flex', gap: 32, marginBottom: 12 }}>
                  <div><div style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--primary)' }}>{pct}%</div><div style={{ fontSize: '0.8rem', color: 'var(--gray-400)' }}>Score</div></div>
                  <div><div style={{ fontSize: '1.3rem', fontWeight: 700 }}>{totalObt}/{totalMax}</div><div style={{ fontSize: '0.8rem', color: 'var(--gray-400)' }}>Marks</div></div>
                  <div><div style={{ fontSize: '1.3rem', fontWeight: 700, color: result.isPassed ? 'var(--success)' : 'var(--danger)' }}>{result.isPassed ? 'PASS' : 'FAIL'}</div><div style={{ fontSize: '0.8rem', color: 'var(--gray-400)' }}>Result</div></div>
                </div>
                <ProgressBar value={pct} />
                {result.subjectMarks?.length > 0 && (
                  <div className="table-wrapper mt-4"><table>
                    <thead><tr><th>Subject</th><th>Marks</th><th>Max</th><th>Status</th></tr></thead>
                    <tbody>
                      {result.subjectMarks.map((m, i) => (
                        <tr key={i}>
                          <td>{m.subjectName}</td>
                          <td style={{ fontWeight: 500 }}>{m.marksObtained}</td>
                          <td>{m.maxMarks}</td>
                          <td><span className={`badge badge-${m.marksObtained >= m.passMarks ? 'success' : 'danger'}`}>{m.marksObtained >= m.passMarks ? 'Pass' : 'Fail'}</span></td>
                        </tr>
                      ))}
                    </tbody>
                  </table></div>
                )}
              </Card>
            );
          })
      )}

      {/* Promotion History */}
      {student.promotionHistory?.length > 0 && (
        <Card title="🎓 Promotion History" style={{ marginBottom: 20 }}>
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>#</th>
                  <th>From Class</th>
                  <th>To Class</th>
                  <th>Academic Year</th>
                  <th>Date</th>
                </tr>
              </thead>
              <tbody>
                {[...student.promotionHistory].reverse().map((h, i) => (
                  <tr key={i}>
                    <td style={{ color: 'var(--gray-400)', fontSize: '0.8rem' }}>{student.promotionHistory.length - i}</td>
                    <td>{h.fromClassName || '—'}{h.fromSection ? ` / ${h.fromSection}` : ''}</td>
                    <td>
                      <span style={{ color: 'var(--success)', fontWeight: 600 }}>
                        {h.toClassName || '—'}{h.toSection ? ` / ${h.toSection}` : ''}
                      </span>
                    </td>
                    <td>
                      <span style={{ fontSize: '0.8rem' }}>{h.fromAcademicYear} → {h.toAcademicYear}</span>
                    </td>
                    <td style={{ fontSize: '0.8rem', color: 'var(--gray-500)' }}>
                      {h.promotedAt ? new Date(h.promotedAt).toLocaleDateString('en-IN') : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Credentials Modal */}
      <Modal isOpen={!!credsModal} onClose={() => setCredsModal(null)} title="🔑 Login Credentials">
        {credsModal && (
          <div>
            <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 10, padding: 20, marginBottom: 16 }}>
              <div style={{ marginBottom: 12, fontSize: '0.875rem', color: '#166534' }}>
                ✅ Login credentials generated. Share these with the student.
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--gray-500)', marginBottom: 2 }}>Email / Username</div>
                  <code style={{ background: '#fff', padding: '6px 12px', borderRadius: 6, border: '1px solid var(--gray-200)', display: 'block', fontWeight: 600 }}>
                    {credsModal.email}
                  </code>
                </div>
                <div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--gray-500)', marginBottom: 2 }}>Password</div>
                  <code style={{ background: '#fff', padding: '6px 12px', borderRadius: 6, border: '1px solid var(--gray-200)', display: 'block', fontWeight: 600, color: 'var(--primary)' }}>
                    {credsModal.password}
                  </code>
                </div>
              </div>
            </div>
            <p style={{ fontSize: '0.8rem', color: 'var(--gray-400)' }}>
              ⚠️ {credsModal.note || 'Save these credentials. The password is shown only once.'}
            </p>
            <button className="btn btn-primary mt-4 w-full" onClick={() => {
              navigator.clipboard?.writeText(`Email: ${credsModal.email}\nPassword: ${credsModal.password}`);
              toast.success('Copied to clipboard!');
            }}>📋 Copy to Clipboard</button>
          </div>
        )}
      </Modal>
    </div>
  );
}
