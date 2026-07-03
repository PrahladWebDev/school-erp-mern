import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { examAPI, classAPI } from '../../api';
import { Card, PageLoader, EmptyState, Modal } from '../../components/common';
import toast from 'react-hot-toast';

export default function ExamsPage() {
  const navigate = useNavigate();
  const { school } = useSelector(s => s.auth);
  const [exams, setExams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [classes, setClasses] = useState([]);
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState({
    name:'', examType:'unit_test', classId:'', startDate:'', endDate:'', academicYear:'',
    subjects:[{ subjectName:'', maxMarks:100, passMarks:35 }]
  });
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const { data } = await examAPI.getAll({ academicYear: school?.currentAcademicYear });
      setExams(data.data.exams || []);
    } catch { toast.error('Failed to load exams'); }
    finally { setLoading(false); }
  };

  useEffect(() => {
    load();
    classAPI.getAll({}).then(r => setClasses(r.data.data.classes || []));
    setForm(f => ({ ...f, academicYear: school?.currentAcademicYear || '' }));
  }, [school]);

  const addSubject = () => setForm(f => ({ ...f, subjects: [...f.subjects, { subjectName:'', maxMarks:100, passMarks:35 }] }));
  const setSubject = (i, key, val) => setForm(f => {
    const s = [...f.subjects]; s[i] = { ...s[i], [key]: val }; return { ...f, subjects: s };
  });

  const handleCreate = async () => {
    if (!form.name || !form.classId) return toast.error('Exam name and class are required');
    setSaving(true);
    try {
      await examAPI.create(form);
      toast.success('Exam created!');
      setModal(false);
      load();
    } catch (err) { toast.error(err.response?.data?.message || 'Failed'); }
    finally { setSaving(false); }
  };

  const STATUS_COLOR = { upcoming:'info', ongoing:'warning', completed:'success', cancelled:'danger' };
  const EXAM_TYPES = ['unit_test','half_yearly','annual','pre_board','practical','oral','other'];

  return (
    <div>
      <div className="page-header">
        <div className="page-header-left"><h1>Examinations</h1></div>
        <button className="btn btn-primary" onClick={() => setModal(true)}>+ Create Exam</button>
      </div>

      {loading ? <PageLoader /> : exams.length === 0 ? (
        <EmptyState icon="📋" title="No exams scheduled"
          action={<button className="btn btn-primary" onClick={() => setModal(true)}>Create Exam</button>} />
      ) : (
        <div className="grid-3">
          {exams.map(e => (
            <div key={e._id} className="card">
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:8 }}>
                <h3 style={{ fontSize:'1rem' }}>{e.name}</h3>
                <span className={`badge badge-${STATUS_COLOR[e.status]||'gray'}`}>{e.status}</span>
              </div>
              <div style={{ fontSize:'0.8rem', color:'var(--gray-400)', marginBottom:12 }}>
                <div>📚 {e.className}</div>
                <div style={{ marginTop:4 }}>🗓 {e.startDate ? new Date(e.startDate).toLocaleDateString('en-IN') : '—'}
                  {e.endDate ? ` — ${new Date(e.endDate).toLocaleDateString('en-IN')}` : ''}</div>
                <div style={{ marginTop:4 }}>📝 {e.subjects?.length || 0} subjects</div>
              </div>
              <div style={{ display:'flex', gap:8 }}>
                {e.status !== 'cancelled' && (
                  <button className="btn btn-outline btn-sm" onClick={() => navigate(`/admin/exams/${e._id}/marks`)}>
                    Enter Marks
                  </button>
                )}
                {e.isResultPublished
                  ? <span className="badge badge-success">Results Published</span>
                  : e.status === 'completed' && (
                    <button className="btn btn-accent btn-sm"
                      onClick={async () => {
                        await examAPI.publish(e._id);
                        toast.success('Results published!');
                        load();
                      }}>Publish Results</button>
                  )
                }
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal isOpen={modal} onClose={() => setModal(false)} title="Create New Exam" size="modal-lg"
        footer={<>
          <button className="btn btn-ghost" onClick={() => setModal(false)}>Cancel</button>
          <button className="btn btn-primary" onClick={handleCreate} disabled={saving}>{saving ? 'Creating...' : 'Create Exam'}</button>
        </>}
      >
        <div className="form-grid-2">
          <div className="form-group">
            <label className="form-label">Exam Name <span className="required">*</span></label>
            <input className="form-input" value={form.name} onChange={e => setForm(f => ({ ...f, name:e.target.value }))} placeholder="First Unit Test" />
          </div>
          <div className="form-group">
            <label className="form-label">Exam Type</label>
            <select className="form-select" value={form.examType} onChange={e => setForm(f => ({ ...f, examType:e.target.value }))}>
              {EXAM_TYPES.map(t => <option key={t} value={t} style={{ textTransform:'capitalize' }}>{t.replace('_',' ')}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Class <span className="required">*</span></label>
            <select className="form-select" value={form.classId} onChange={e => setForm(f => ({ ...f, classId:e.target.value }))}>
              <option value="">Select Class</option>
              {classes.map(c => <option key={c._id} value={c._id}>{c.name}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Academic Year</label>
            <input className="form-input" value={form.academicYear} onChange={e => setForm(f => ({ ...f, academicYear:e.target.value }))} />
          </div>
          <div className="form-group">
            <label className="form-label">Start Date</label>
            <input className="form-input" type="date" value={form.startDate} onChange={e => setForm(f => ({ ...f, startDate:e.target.value }))} />
          </div>
          <div className="form-group">
            <label className="form-label">End Date</label>
            <input className="form-input" type="date" value={form.endDate} onChange={e => setForm(f => ({ ...f, endDate:e.target.value }))} />
          </div>
        </div>

        <div style={{ marginTop:20 }}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:12 }}>
            <h4 style={{ fontSize:'0.9rem' }}>Subjects</h4>
            <button type="button" className="btn btn-ghost btn-sm" onClick={addSubject}>+ Add Subject</button>
          </div>
          {form.subjects.map((s, i) => (
            <div key={i} style={{ display:'grid', gridTemplateColumns:'2fr 1fr 1fr auto', gap:8, marginBottom:8, alignItems:'end' }}>
              <div className="form-group" style={{ margin:0 }}>
                {i === 0 && <label className="form-label">Subject Name</label>}
                <input className="form-input" value={s.subjectName} onChange={e => setSubject(i,'subjectName',e.target.value)} placeholder="Mathematics" />
              </div>
              <div className="form-group" style={{ margin:0 }}>
                {i === 0 && <label className="form-label">Max Marks</label>}
                <input className="form-input" type="number" value={s.maxMarks} onChange={e => setSubject(i,'maxMarks',parseInt(e.target.value))} />
              </div>
              <div className="form-group" style={{ margin:0 }}>
                {i === 0 && <label className="form-label">Pass Marks</label>}
                <input className="form-input" type="number" value={s.passMarks} onChange={e => setSubject(i,'passMarks',parseInt(e.target.value))} />
              </div>
              <button type="button" style={{ background:'none', border:'none', color:'var(--danger)', cursor:'pointer', fontSize:'1.1rem', paddingBottom: i===0?0:4 }}
                onClick={() => setForm(f => ({ ...f, subjects: f.subjects.filter((_,j) => j !== i) }))}>✕</button>
            </div>
          ))}
        </div>
      </Modal>
    </div>
  );
}
