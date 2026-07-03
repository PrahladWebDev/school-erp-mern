import React, { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import { homeworkAPI, classAPI } from '../../api';
import { Card, PageLoader, EmptyState, Modal } from '../../components/common';
import toast from 'react-hot-toast';

export default function TeacherHomeworkPage() {
  const { school } = useSelector(s => s.auth);
  const [homeworks, setHomeworks] = useState([]);
  const [classes, setClasses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ classId: '', section: '', subject: '', title: '', description: '', dueDate: '' });

  const load = async () => {
    setLoading(true);
    try {
      const { data } = await homeworkAPI.getAll({ academicYear: school?.currentAcademicYear, limit: 50 });
      setHomeworks(data.data.homeworks || []);
    } catch { toast.error('Failed to load homework'); }
    finally { setLoading(false); }
  };

  useEffect(() => {
    load();
    classAPI.getAll({}).then(r => setClasses(r.data.data.classes || []));
  }, [school]);

  const handleCreate = async () => {
    if (!form.classId || !form.subject || !form.title || !form.dueDate) return toast.error('Fill all required fields');
    setSaving(true);
    const fd = new FormData();
    Object.entries(form).forEach(([k, v]) => v && fd.append(k, v));
    // Always include current academic year
    if (school?.currentAcademicYear) fd.append('academicYear', school.currentAcademicYear);
    try {
      await homeworkAPI.create(fd);
      toast.success('Homework assigned!');
      setModal(false);
      setForm({ classId: '', section: '', subject: '', title: '', description: '', dueDate: '' });
      load();
    } catch (err) { toast.error(err.response?.data?.message || 'Failed'); }
    finally { setSaving(false); }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Cancel this homework?')) return;
    try {
      await homeworkAPI.delete(id);
      toast.success('Homework cancelled');
      load();
    } catch { toast.error('Failed'); }
  };

  if (loading) return <PageLoader />;
  const selectedClass = classes.find(c => c._id === form.classId);

  return (
    <div>
      <div className="page-header">
        <div className="page-header-left"><h1>Homework Management</h1></div>
        <button className="btn btn-primary" onClick={() => setModal(true)}>+ Assign Homework</button>
      </div>

      {homeworks.length === 0
        ? <EmptyState icon="📚" title="No homework assigned" description="Assign homework to your classes" action={<button className="btn btn-primary" onClick={() => setModal(true)}>+ Assign Homework</button>} />
        : <Card title={`Homework (${homeworks.length})`}>
          <div className="table-wrapper">
            <table>
              <thead><tr><th>Subject</th><th>Title</th><th>Class</th><th>Due Date</th><th>Status</th><th></th></tr></thead>
              <tbody>
                {homeworks.map(hw => (
                  <tr key={hw._id}>
                    <td style={{ fontWeight: 500 }}>{hw.subject}</td>
                    <td>{hw.title}</td>
                    <td>{hw.classId?.name || '—'}{hw.section ? ` - ${hw.section}` : ''}</td>
                    <td>{new Date(hw.dueDate).toLocaleDateString('en-IN')}</td>
                    <td><span className={`badge badge-${hw.status === 'active' ? 'success' : 'gray'}`}>{hw.status}</span></td>
                    <td>
                      {hw.status === 'active' && (
                        <button className="btn btn-ghost btn-sm" onClick={() => handleDelete(hw._id)}>Cancel</button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      }

      <Modal isOpen={modal} onClose={() => setModal(false)} title="Assign Homework"
        footer={<><button className="btn btn-ghost" onClick={() => setModal(false)}>Cancel</button><button className="btn btn-primary" onClick={handleCreate} disabled={saving}>{saving ? 'Saving...' : 'Assign'}</button></>}>
        <div className="form-grid">
          <div className="form-group">
            <label className="form-label">Class *</label>
            <select className="form-select" value={form.classId} onChange={e => setForm(f => ({ ...f, classId: e.target.value, section: '' }))}>
              <option value="">Select Class</option>
              {classes.map(c => <option key={c._id} value={c._id}>{c.name}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Section</label>
            <select className="form-select" value={form.section} onChange={e => setForm(f => ({ ...f, section: e.target.value }))}>
              <option value="">All Sections</option>
              {(selectedClass?.sections || []).map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Subject *</label>
            <input className="form-input" value={form.subject} onChange={e => setForm(f => ({ ...f, subject: e.target.value }))} placeholder="e.g. Mathematics" />
          </div>
          <div className="form-group">
            <label className="form-label">Due Date *</label>
            <input className="form-input" type="date" value={form.dueDate} min={new Date().toISOString().split('T')[0]} onChange={e => setForm(f => ({ ...f, dueDate: e.target.value }))} />
          </div>
          <div className="form-group" style={{ gridColumn: '1/-1' }}>
            <label className="form-label">Title *</label>
            <input className="form-input" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="Homework title" />
          </div>
          <div className="form-group" style={{ gridColumn: '1/-1' }}>
            <label className="form-label">Description</label>
            <textarea className="form-input" rows={3} value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Details / instructions..." />
          </div>
        </div>
      </Modal>
    </div>
  );
}
