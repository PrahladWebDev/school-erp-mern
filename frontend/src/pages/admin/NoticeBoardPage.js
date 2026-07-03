import React, { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import { noticeAPI } from '../../api';
import { Card, PageLoader, EmptyState, Modal, ConfirmDialog } from '../../components/common';
import toast from 'react-hot-toast';

export default function NoticeBoardPage() {
  const { user } = useSelector(s => s.auth);
  const [notices, setNotices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(false);
  const [deleteId, setDeleteId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ title: '', content: '', category: 'general', targetAudience: 'all', publishDate: new Date().toISOString().split('T')[0] });

  const load = async () => {
    setLoading(true);
    try {
      const { data } = await noticeAPI.getAll({ limit: 50 });
      setNotices(data.data.notices || []);
    } catch { toast.error('Failed to load notices'); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const handleCreate = async () => {
    if (!form.title || !form.content) return toast.error('Title and content are required');
    setSaving(true);
    try {
      await noticeAPI.create(form);
      toast.success('Notice published!');
      setModal(false);
      setForm({ title: '', content: '', category: 'general', targetAudience: 'all', publishDate: new Date().toISOString().split('T')[0] });
      load();
    } catch (err) { toast.error(err.response?.data?.message || 'Failed'); }
    finally { setSaving(false); }
  };

  const handleDelete = async () => {
    try { await noticeAPI.delete(deleteId); toast.success('Notice deleted'); setDeleteId(null); load(); }
    catch { toast.error('Failed to delete'); }
  };

  if (loading) return <PageLoader />;

  const AUDIENCE_LABELS = { all: 'All', students: 'Students', teachers: 'Teachers', parents: 'Parents' };
  const CATEGORY_LABELS = { general: 'General', exam: 'Exam', holiday: 'Holiday', event: 'Event', urgent: 'Urgent' };

  return (
    <div>
      <div className="page-header">
        <div className="page-header-left"><h1>Notice Board</h1></div>
        <button className="btn btn-primary" onClick={() => setModal(true)}>+ Post Notice</button>
      </div>

      {notices.length === 0
        ? <EmptyState icon="📢" title="No notices" action={<button className="btn btn-primary" onClick={() => setModal(true)}>+ Post Notice</button>} />
        : <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {notices.map(n => (
            <Card key={n._id}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
                    <span className="badge badge-primary">{CATEGORY_LABELS[n.category] || n.category}</span>
                    <span className="badge badge-gray">{AUDIENCE_LABELS[n.targetAudience] || n.targetAudience}</span>
                    {!n.isActive && <span className="badge badge-danger">Inactive</span>}
                  </div>
                  <h3 style={{ margin: '0 0 6px', fontSize: '1rem', fontWeight: 600 }}>{n.title}</h3>
                  <p style={{ color: 'var(--gray-500)', fontSize: '0.875rem', margin: '0 0 8px' }}>{n.content}</p>
                  <div style={{ fontSize: '0.75rem', color: 'var(--gray-400)' }}>
                    Posted: {new Date(n.publishDate).toLocaleDateString('en-IN')} {n.expiryDate ? `• Expires: ${new Date(n.expiryDate).toLocaleDateString('en-IN')}` : ''}
                  </div>
                </div>
                <button className="btn btn-ghost btn-sm" style={{ color: 'var(--danger)', marginLeft: 12 }} onClick={() => setDeleteId(n._id)}>Delete</button>
              </div>
            </Card>
          ))}
        </div>
      }

      <Modal isOpen={modal} onClose={() => setModal(false)} title="Post Notice"
        footer={<><button className="btn btn-ghost" onClick={() => setModal(false)}>Cancel</button><button className="btn btn-primary" onClick={handleCreate} disabled={saving}>{saving ? 'Posting...' : 'Post Notice'}</button></>}>
        <div className="form-grid">
          <div className="form-group" style={{ gridColumn: '1/-1' }}><label className="form-label">Title *</label>
            <input className="form-input" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="Notice title" />
          </div>
          <div className="form-group"><label className="form-label">Category</label>
            <select className="form-select" value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))}>
              {Object.entries(CATEGORY_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </div>
          <div className="form-group"><label className="form-label">Target Audience</label>
            <select className="form-select" value={form.targetAudience} onChange={e => setForm(f => ({ ...f, targetAudience: e.target.value }))}>
              {Object.entries(AUDIENCE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </div>
          <div className="form-group"><label className="form-label">Publish Date</label>
            <input className="form-input" type="date" value={form.publishDate} onChange={e => setForm(f => ({ ...f, publishDate: e.target.value }))} />
          </div>
          <div className="form-group"><label className="form-label">Expiry Date</label>
            <input className="form-input" type="date" value={form.expiryDate || ''} onChange={e => setForm(f => ({ ...f, expiryDate: e.target.value }))} />
          </div>
          <div className="form-group" style={{ gridColumn: '1/-1' }}><label className="form-label">Content *</label>
            <textarea className="form-input" rows={4} value={form.content} onChange={e => setForm(f => ({ ...f, content: e.target.value }))} placeholder="Notice content..." />
          </div>
        </div>
      </Modal>

      <ConfirmDialog isOpen={!!deleteId} onClose={() => setDeleteId(null)} onConfirm={handleDelete}
        title="Delete Notice" message="Are you sure you want to delete this notice?" confirmLabel="Delete" danger />
    </div>
  );
}
