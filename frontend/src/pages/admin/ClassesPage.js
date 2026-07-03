import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { fetchClasses } from '../../store/slices/classSlice';
import { classAPI } from '../../api';
import { Card, Modal, EmptyState, PageLoader } from '../../components/common';
import toast from 'react-hot-toast';

export default function ClassesPage() {
  const dispatch = useDispatch();
  const { school } = useSelector(s => s.auth);
  const { list: classes, loading } = useSelector(s => s.classes);
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState({ name:'', sections:['A'], academicYear:'', capacity:50 });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    dispatch(fetchClasses({ academicYear: school?.currentAcademicYear }));
    setForm(f => ({ ...f, academicYear: school?.currentAcademicYear || '' }));
  }, [dispatch, school]);

  const handleCreate = async () => {
    if (!form.name) return toast.error('Class name is required');
    setSaving(true);
    try {
      await classAPI.create(form);
      toast.success('Class created!');
      setModal(false);
      dispatch(fetchClasses({ academicYear: school?.currentAcademicYear }));
    } catch (err) { toast.error(err.response?.data?.message || 'Failed'); }
    finally { setSaving(false); }
  };

  const CLASS_COLORS = ['#e8f0fe','#f0fdf4','#fff7ed','#f5f3ff','#fef2f2','#f0f9ff'];

  return (
    <div>
      <div className="page-header">
        <div className="page-header-left"><h1>Classes</h1><p>{classes.length} classes this academic year</p></div>
        <button className="btn btn-primary" onClick={() => setModal(true)}>+ Add Class</button>
      </div>

      {loading ? <PageLoader /> : classes.length === 0 ? (
        <EmptyState icon="🏛️" title="No classes yet"
          action={<button className="btn btn-primary" onClick={() => setModal(true)}>Add Class</button>} />
      ) : (
        <div className="grid-3">
          {classes.map((cls, i) => (
            <div key={cls._id} className="card" style={{ borderTop:`4px solid var(--primary)` }}>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start' }}>
                <div>
                  <h3 style={{ fontSize:'1.2rem', marginBottom:4 }}>{cls.name}</h3>
                  <p style={{ fontSize:'0.8rem', color:'var(--gray-400)' }}>{cls.academicYear}</p>
                </div>
                <div style={{ background:CLASS_COLORS[i % CLASS_COLORS.length], borderRadius:8, padding:'8px 12px', textAlign:'center' }}>
                  <div style={{ fontSize:'1.4rem', fontWeight:700, color:'var(--primary)' }}>{cls.studentCount || 0}</div>
                  <div style={{ fontSize:'0.65rem', color:'var(--gray-500)', textTransform:'uppercase' }}>Students</div>
                </div>
              </div>
              <div style={{ marginTop:12, display:'flex', gap:6, flexWrap:'wrap' }}>
                {(cls.sections || []).map(s => (
                  <span key={s} style={{ background:'var(--gray-100)', borderRadius:6, padding:'3px 10px', fontSize:'0.8rem', fontWeight:500 }}>
                    Sec {s}
                  </span>
                ))}
              </div>
              {cls.classTeacher && (
                <div style={{ marginTop:10, fontSize:'0.8rem', color:'var(--gray-500)' }}>
                  👩‍🏫 {cls.classTeacher.firstName} {cls.classTeacher.lastName}
                </div>
              )}
              <div style={{ marginTop:12, display:'flex', gap:8 }}>
                <button className="btn btn-ghost btn-sm">Students</button>
                <button className="btn btn-ghost btn-sm">Edit</button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal isOpen={modal} onClose={() => setModal(false)} title="Add New Class"
        footer={<>
          <button className="btn btn-ghost" onClick={() => setModal(false)}>Cancel</button>
          <button className="btn btn-primary" onClick={handleCreate} disabled={saving}>{saving ? 'Creating...' : 'Create Class'}</button>
        </>}
      >
        <div className="form-group">
          <label className="form-label">Class Name <span className="required">*</span></label>
          <input className="form-input" placeholder="e.g. Class 5, Grade 8" value={form.name}
            onChange={e => setForm(f => ({ ...f, name:e.target.value }))} />
        </div>
        <div className="form-grid-2">
          <div className="form-group">
            <label className="form-label">Sections (comma-separated)</label>
            <input className="form-input" placeholder="A, B, C" value={(form.sections || []).join(', ')}
              onChange={e => setForm(f => ({ ...f, sections: e.target.value.split(',').map(s => s.trim().toUpperCase()).filter(Boolean) }))} />
          </div>
          <div className="form-group">
            <label className="form-label">Capacity per Section</label>
            <input className="form-input" type="number" value={form.capacity}
              onChange={e => setForm(f => ({ ...f, capacity: parseInt(e.target.value) }))} />
          </div>
        </div>
        <div className="form-group">
          <label className="form-label">Academic Year</label>
          <input className="form-input" value={form.academicYear}
            onChange={e => setForm(f => ({ ...f, academicYear:e.target.value }))} placeholder="2024-2025" />
        </div>
      </Modal>
    </div>
  );
}
