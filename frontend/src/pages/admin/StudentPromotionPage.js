import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { fetchClasses } from '../../store/slices/classSlice';
import { studentAPI, classAPI } from '../../api';
import { PageLoader, EmptyState, Avatar } from '../../components/common';
import toast from 'react-hot-toast';

export default function StudentPromotionPage() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { school } = useSelector(s => s.auth);
  const { list: classes, loading: classesLoading } = useSelector(s => s.classes);

  // Step state: 'select' → 'review' → 'done'
  const [step, setStep] = useState('select');

  // Filter / source class
  const [fromClassId, setFromClassId] = useState('');
  const [fromSection, setFromSection] = useState('');
  const [toClassId, setToClassId] = useState('');
  const [toSection, setToSection] = useState('');
  const [newAcademicYear, setNewAcademicYear] = useState('');

  // Students
  const [students, setStudents] = useState([]);
  const [selected, setSelected] = useState([]); // ids
  const [loadingStudents, setLoadingStudents] = useState(false);
  const [promoting, setPromoting] = useState(false);
  const [result, setResult] = useState(null);

  useEffect(() => {
    dispatch(fetchClasses({}));
    // Default new academic year to next year
    const currentYear = school?.currentAcademicYear || `${new Date().getFullYear()}-${new Date().getFullYear() + 1}`;
    const [start, end] = currentYear.split('-').map(Number);
    if (start && end) setNewAcademicYear(`${start + 1}-${end + 1}`);
    else setNewAcademicYear(currentYear);
  }, [dispatch, school]);

  // Sorted classes by numericName / name
  const sortedClasses = [...classes].sort((a, b) => {
    if (a.numericName != null && b.numericName != null) return a.numericName - b.numericName;
    return a.name.localeCompare(b.name);
  });

  const fromClass = classes.find(c => c._id === fromClassId);
  const toClass = classes.find(c => c._id === toClassId);

  // Auto-suggest next class when user picks source class
  const handleFromClassChange = (id) => {
    setFromClassId(id);
    setFromSection('');
    setToClassId('');
    setToSection('');
    setStudents([]);
    setSelected([]);

    if (!id) return;
    const cls = classes.find(c => c._id === id);
    if (!cls) return;
    // Find class with numericName = cls.numericName + 1
    if (cls.numericName != null) {
      const next = sortedClasses.find(c => c.numericName === cls.numericName + 1);
      if (next) setToClassId(next._id);
    }
  };

  const loadStudents = useCallback(async () => {
    if (!fromClassId) return toast.error('Please select source class');
    setLoadingStudents(true);
    setStudents([]);
    setSelected([]);
    try {
      const { data } = await studentAPI.getAll({
        classId: fromClassId,
        section: fromSection || undefined,
        status: 'active',
        limit: 200,
      });
      const list = data.data?.students || data.data || [];
      setStudents(list);
      setSelected(list.map(s => s._id)); // select all by default
      if (list.length === 0) toast('No active students found in this class.', { icon: 'ℹ️' });
    } catch {
      toast.error('Failed to load students');
    } finally {
      setLoadingStudents(false);
    }
  }, [fromClassId, fromSection]);

  const toggleStudent = (id) => {
    setSelected(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const toggleAll = () => {
    setSelected(prev => prev.length === students.length ? [] : students.map(s => s._id));
  };

  const handleReview = () => {
    if (selected.length === 0) return toast.error('Select at least one student to promote');
    if (!toClassId) return toast.error('Please select the target class');
    if (!newAcademicYear.trim()) return toast.error('Please enter the new academic year');
    setStep('review');
  };

  const handlePromote = async () => {
    setPromoting(true);
    try {
      const { data } = await studentAPI.bulkPromote({
        studentIds: selected,
        newClassId: toClassId,
        newSection: toSection || undefined,
        newAcademicYear: newAcademicYear.trim(),
      });
      setResult({
        count: selected.length,
        fromClass: fromClass?.name,
        toClass: toClass?.name,
        fromSection,
        toSection,
        newAcademicYear,
      });
      setStep('done');
      toast.success(data.message || `${selected.length} students promoted successfully!`);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Promotion failed');
    } finally {
      setPromoting(false);
    }
  };

  const reset = () => {
    setStep('select');
    setFromClassId('');
    setFromSection('');
    setToClassId('');
    setToSection('');
    setStudents([]);
    setSelected([]);
    setResult(null);
  };

  const selectedStudents = students.filter(s => selected.includes(s._id));

  if (classesLoading) return <PageLoader />;

  return (
    <div>
      {/* Header */}
      <div className="page-header">
        <div className="page-header-left">
          <h1>🎓 Student Promotion</h1>
          <p>Promote students from one class to the next academic year</p>
        </div>
      </div>

      {/* Progress Steps */}
      <div className="card mb-5" style={{ padding: '16px 24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 0 }}>
          {[
            { key: 'select', label: '1. Select & Configure', icon: '⚙️' },
            { key: 'review', label: '2. Review Students', icon: '👥' },
            { key: 'done',   label: '3. Done',              icon: '✅' },
          ].map((s, i, arr) => (
            <React.Fragment key={s.key}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{
                  width: 32, height: 32, borderRadius: '50%', display: 'flex',
                  alignItems: 'center', justifyContent: 'center', fontSize: 16,
                  background: step === s.key ? 'var(--primary)' :
                    (step === 'review' && s.key === 'select') || step === 'done' ? 'var(--success)' : 'var(--gray-100)',
                  color: step === s.key || (step === 'review' && s.key === 'select') || step === 'done' ? '#fff' : 'var(--gray-400)',
                }}>
                  {(step === 'review' && s.key === 'select') || (step === 'done' && s.key !== 'done') ? '✓' : s.icon}
                </div>
                <span style={{
                  fontWeight: step === s.key ? 600 : 400,
                  color: step === s.key ? 'var(--primary)' : 'var(--gray-500)',
                  fontSize: '0.875rem'
                }}>{s.label}</span>
              </div>
              {i < arr.length - 1 && (
                <div style={{ flex: 1, height: 2, background: 'var(--gray-200)', margin: '0 12px' }} />
              )}
            </React.Fragment>
          ))}
        </div>
      </div>

      {/* ── STEP 1: Select ── */}
      {step === 'select' && (
        <>
          <div className="card mb-5">
            <h2 style={{ marginBottom: 20, fontSize: '1rem', fontWeight: 600 }}>Promotion Settings</h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16 }}>

              <div className="form-group">
                <label className="form-label">From Class <span style={{ color: 'var(--danger)' }}>*</span></label>
                <select className="form-select" value={fromClassId} onChange={e => handleFromClassChange(e.target.value)}>
                  <option value="">— Select current class —</option>
                  {sortedClasses.map(c => (
                    <option key={c._id} value={c._id}>{c.name}</option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">From Section (optional)</label>
                <select className="form-select" value={fromSection} onChange={e => { setFromSection(e.target.value); setStudents([]); setSelected([]); }} disabled={!fromClassId}>
                  <option value="">All Sections</option>
                  {(fromClass?.sections || []).map(sec => (
                    <option key={sec} value={sec}>Section {sec}</option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">To Class <span style={{ color: 'var(--danger)' }}>*</span></label>
                <select className="form-select" value={toClassId} onChange={e => { setToClassId(e.target.value); setToSection(''); }}>
                  <option value="">— Select target class —</option>
                  {sortedClasses.map(c => (
                    <option key={c._id} value={c._id}>{c.name}</option>
                  ))}
                </select>
                {fromClass && toClass && (
                  <p style={{ margin: '4px 0 0', fontSize: '0.75rem', color: 'var(--success)' }}>
                    ✓ {fromClass.name} → {toClass.name}
                  </p>
                )}
              </div>

              <div className="form-group">
                <label className="form-label">To Section (optional)</label>
                <select className="form-select" value={toSection} onChange={e => setToSection(e.target.value)} disabled={!toClassId}>
                  <option value="">Keep same / Auto-assign</option>
                  {(toClass?.sections || []).map(sec => (
                    <option key={sec} value={sec}>Section {sec}</option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">New Academic Year <span style={{ color: 'var(--danger)' }}>*</span></label>
                <input
                  className="form-input"
                  value={newAcademicYear}
                  onChange={e => setNewAcademicYear(e.target.value)}
                  placeholder="e.g. 2025-2026"
                />
              </div>
            </div>

            <div style={{ marginTop: 20, display: 'flex', gap: 12 }}>
              <button className="btn btn-primary" onClick={loadStudents} disabled={!fromClassId || loadingStudents}>
                {loadingStudents ? '⏳ Loading...' : '🔍 Load Students'}
              </button>
            </div>
          </div>

          {/* Student list */}
          {loadingStudents && <PageLoader />}

          {!loadingStudents && students.length > 0 && (
            <div className="card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <div>
                  <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 600 }}>
                    Students in {fromClass?.name}{fromSection ? ` / Section ${fromSection}` : ''}
                  </h3>
                  <p style={{ margin: '4px 0 0', fontSize: '0.8rem', color: 'var(--gray-500)' }}>
                    {selected.length} of {students.length} selected for promotion
                  </p>
                </div>
                <button className="btn btn-ghost btn-sm" onClick={toggleAll}>
                  {selected.length === students.length ? 'Deselect All' : 'Select All'}
                </button>
              </div>

              <div className="table-wrapper">
                <table>
                  <thead>
                    <tr>
                      <th style={{ width: 40 }}>
                        <input type="checkbox" checked={selected.length === students.length && students.length > 0} onChange={toggleAll} />
                      </th>
                      <th>Student</th>
                      <th>Adm. No</th>
                      <th>Current Class</th>
                      <th>Roll No</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {students.map(s => (
                      <tr key={s._id} style={{ background: selected.includes(s._id) ? 'var(--primary-50, #eff6ff)' : undefined }}>
                        <td>
                          <input
                            type="checkbox"
                            checked={selected.includes(s._id)}
                            onChange={() => toggleStudent(s._id)}
                          />
                        </td>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            <Avatar src={s.photo?.url} name={`${s.firstName} ${s.lastName || ''}`} size="sm" />
                            <div>
                              <div style={{ fontWeight: 500 }}>{s.firstName} {s.lastName}</div>
                              <div style={{ fontSize: '0.75rem', color: 'var(--gray-400)' }}>{s.gender}</div>
                            </div>
                          </div>
                        </td>
                        <td style={{ fontFamily: 'monospace', fontSize: '0.875rem' }}>{s.admissionNumber}</td>
                        <td>{s.class?.name}{s.section ? ` / ${s.section}` : ''}</td>
                        <td>{s.rollNumber || '—'}</td>
                        <td><span className="badge badge-success">{s.status}</span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div style={{ marginTop: 20, display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
                <button className="btn btn-primary" onClick={handleReview} disabled={selected.length === 0}>
                  Review & Promote →
                </button>
              </div>
            </div>
          )}

          {!loadingStudents && students.length === 0 && fromClassId && (
            <EmptyState icon="👨‍🎓" title="No students loaded" description="Click 'Load Students' to fetch students from the selected class." />
          )}
        </>
      )}

      {/* ── STEP 2: Review ── */}
      {step === 'review' && (
        <div className="card">
          {/* Summary banner */}
          <div style={{
            background: 'var(--primary-50, #eff6ff)',
            border: '1.5px solid var(--primary)',
            borderRadius: 10, padding: '16px 20px', marginBottom: 24,
            display: 'flex', flexWrap: 'wrap', gap: 24, alignItems: 'center'
          }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '2rem', fontWeight: 700, color: 'var(--primary)' }}>{selectedStudents.length}</div>
              <div style={{ fontSize: '0.75rem', color: 'var(--gray-500)' }}>Students</div>
            </div>
            <div style={{ fontSize: '1.5rem' }}>→</div>
            <div>
              <div style={{ fontWeight: 600 }}>{fromClass?.name}{fromSection ? ` / Sec ${fromSection}` : ''}</div>
              <div style={{ fontSize: '0.75rem', color: 'var(--gray-500)' }}>Current Class</div>
            </div>
            <div style={{ fontSize: '1.5rem', color: 'var(--success)' }}>→</div>
            <div>
              <div style={{ fontWeight: 600, color: 'var(--success)' }}>{toClass?.name}{toSection ? ` / Sec ${toSection}` : ''}</div>
              <div style={{ fontSize: '0.75rem', color: 'var(--gray-500)' }}>New Class</div>
            </div>
            <div style={{ marginLeft: 'auto', textAlign: 'right' }}>
              <div style={{ fontWeight: 600 }}>{newAcademicYear}</div>
              <div style={{ fontSize: '0.75rem', color: 'var(--gray-500)' }}>New Academic Year</div>
            </div>
          </div>

          <h3 style={{ marginBottom: 12, fontSize: '0.95rem', fontWeight: 600 }}>
            Students to be promoted ({selectedStudents.length})
          </h3>

          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>#</th>
                  <th>Student</th>
                  <th>Adm. No</th>
                  <th>Current Class</th>
                  <th>Will Become</th>
                </tr>
              </thead>
              <tbody>
                {selectedStudents.map((s, i) => (
                  <tr key={s._id}>
                    <td style={{ color: 'var(--gray-400)', fontSize: '0.8rem' }}>{i + 1}</td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <Avatar src={s.photo?.url} name={`${s.firstName} ${s.lastName || ''}`} size="sm" />
                        <span style={{ fontWeight: 500 }}>{s.firstName} {s.lastName}</span>
                      </div>
                    </td>
                    <td style={{ fontFamily: 'monospace', fontSize: '0.875rem' }}>{s.admissionNumber}</td>
                    <td>{s.class?.name}{s.section ? ` / ${s.section}` : ''}</td>
                    <td>
                      <span style={{ color: 'var(--success)', fontWeight: 600 }}>
                        {toClass?.name}{toSection ? ` / ${toSection}` : ''}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div style={{ marginTop: 24, padding: '12px 16px', background: 'var(--warning-50, #fffbeb)', borderRadius: 8, border: '1px solid var(--warning, #f59e0b)' }}>
            <p style={{ margin: 0, fontSize: '0.875rem', color: 'var(--warning-700, #92400e)' }}>
              ⚠️ <strong>This action will update {selectedStudents.length} student records.</strong> Their class, section, and academic year will be changed permanently. This cannot be undone automatically.
            </p>
          </div>

          <div style={{ marginTop: 20, display: 'flex', justifyContent: 'space-between', gap: 12 }}>
            <button className="btn btn-ghost" onClick={() => setStep('select')}>← Go Back</button>
            <button className="btn btn-primary" onClick={handlePromote} disabled={promoting}>
              {promoting ? '⏳ Promoting...' : `✅ Confirm & Promote ${selectedStudents.length} Students`}
            </button>
          </div>
        </div>
      )}

      {/* ── STEP 3: Done ── */}
      {step === 'done' && result && (
        <div className="card" style={{ textAlign: 'center', padding: '48px 24px' }}>
          <div style={{ fontSize: '4rem', marginBottom: 16 }}>🎉</div>
          <h2 style={{ marginBottom: 8 }}>Promotion Successful!</h2>
          <p style={{ color: 'var(--gray-500)', fontSize: '1rem', marginBottom: 24 }}>
            <strong>{result.count}</strong> students have been promoted from{' '}
            <strong>{result.fromClass}{result.fromSection ? ` / ${result.fromSection}` : ''}</strong>{' '}
            to{' '}
            <strong>{result.toClass}{result.toSection ? ` / ${result.toSection}` : ''}</strong>{' '}
            for academic year <strong>{result.newAcademicYear}</strong>.
          </p>
          <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
            <button className="btn btn-primary" onClick={reset}>
              🔄 Promote Another Batch
            </button>
            <button className="btn btn-outline" onClick={() => navigate('/admin/students')}>
              👨‍🎓 Go to Students
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
