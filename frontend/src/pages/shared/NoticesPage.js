import React, { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import { noticeAPI } from '../../api';
import { Card, SearchInput, Pagination, PageLoader, EmptyState, Modal } from '../../components/common';
import toast from 'react-hot-toast';

const CATEGORY_COLORS = {
  general:'primary', holiday:'success', event:'accent', circular:'info',
  exam:'warning', fees:'danger', urgent:'danger', other:'gray'
};

export default function NoticesPage() {
  const { user } = useSelector(s => s.auth);
  const [notices, setNotices] = useState([]);
  const [pagination, setPagination] = useState({});
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState(null);
  const [createModal, setCreateModal] = useState(false);
  const [form, setForm] = useState({ title:'', content:'', category:'general', targetAudience:['all'], expiryDate:'' });
  const [saving, setSaving] = useState(false);

  const canCreate = ['super_admin','school_admin','teacher'].includes(user?.role);

  const load = async () => {
    setLoading(true);
    try {
      const { data } = await noticeAPI.getAll({ page, limit:12, search, category });
      setNotices(data.data.notices || []);
      setPagination(data.data.pagination || {});
    } catch { toast.error('Failed to load notices'); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [page, search, category]);

  const handleCreate = async () => {
    if (!form.title || !form.content) return toast.error('Title and content are required');
    setSaving(true);
    try {
      await noticeAPI.create(form);
      toast.success('Notice published!');
      setCreateModal(false);
      setForm({ title:'', content:'', category:'general', targetAudience:['all'], expiryDate:'' });
      load();
    } catch (err) { toast.error(err.response?.data?.message || 'Failed'); }
    finally { setSaving(false); }
  };

  const CATEGORIES = ['general','holiday','event','circular','exam','fees','urgent','other'];

  return (
    <div>
      <div className="page-header">
        <div className="page-header-left"><h1>Notice Board</h1><p>{pagination.total || 0} notices</p></div>
        {canCreate && <button className="btn btn-primary" onClick={() => setCreateModal(true)}>📢 Post Notice</button>}
      </div>

      <div className="card mb-5">
        <div className="filter-bar">
          <SearchInput value={search} onChange={v => { setSearch(v); setPage(1); }} placeholder="Search notices..." />
          <select className="form-select" style={{ width:140 }} value={category} onChange={e => { setCategory(e.target.value); setPage(1); }}>
            <option value="">All Categories</option>
            {CATEGORIES.map(c => <option key={c} value={c} style={{ textTransform:'capitalize' }}>{c}</option>)}
          </select>
        </div>
      </div>

      {loading ? <PageLoader /> : notices.length === 0 ? (
        <EmptyState icon="📢" title="No notices" description="No notices have been posted yet." />
      ) : (
        <>
          <div className="grid-3">
            {notices.map(n => (
              <div key={n._id} className="card" style={{ cursor:'pointer', borderTop:`3px solid var(--${CATEGORY_COLORS[n.category] || 'gray'})` }}
                onClick={() => setSelected(n)}>
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', gap:8 }}>
                  <h3 style={{ fontSize:'0.95rem', fontWeight:600, flex:1 }}>{n.isPinned && '📌 '}{n.title}</h3>
                  <span className={`badge badge-${CATEGORY_COLORS[n.category] || 'gray'}`} style={{ flexShrink:0 }}>{n.category}</span>
                </div>
                <p style={{ fontSize:'0.8rem', color:'var(--gray-500)', marginTop:8, lineHeight:1.6,
                  overflow:'hidden', display:'-webkit-box', WebkitLineClamp:3, WebkitBoxOrient:'vertical' }}>
                  {n.content}
                </p>
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginTop:12 }}>
                  <span style={{ fontSize:'0.72rem', color:'var(--gray-400)' }}>
                    {new Date(n.publishDate).toLocaleDateString('en-IN', { day:'2-digit', month:'short', year:'numeric' })}
                  </span>
                  {n.expiryDate && (
                    <span style={{ fontSize:'0.7rem', color:'var(--warning)' }}>
                      Expires: {new Date(n.expiryDate).toLocaleDateString('en-IN', { day:'2-digit', month:'short' })}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
          <Pagination page={page} pages={pagination.pages} onPage={setPage} />
        </>
      )}

      {/* View Modal */}
      <Modal isOpen={!!selected} onClose={() => setSelected(null)} title={selected?.title} size="modal-lg">
        {selected && (
          <div>
            <div style={{ display:'flex', gap:8, marginBottom:16 }}>
              <span className={`badge badge-${CATEGORY_COLORS[selected.category]||'gray'}`}>{selected.category}</span>
              {(selected.targetAudience||[]).map(a => <span key={a} className="badge badge-gray">{a}</span>)}
            </div>
            <div style={{ lineHeight:1.8, color:'var(--gray-700)', whiteSpace:'pre-wrap', fontSize:'0.925rem' }}>
              {selected.content}
            </div>
            <div style={{ marginTop:20, paddingTop:16, borderTop:'1px solid var(--gray-100)', fontSize:'0.8rem', color:'var(--gray-400)' }}>
              Posted by {selected.createdByName} on {new Date(selected.publishDate).toLocaleDateString('en-IN')}
            </div>
          </div>
        )}
      </Modal>

      {/* Create Modal */}
      <Modal isOpen={createModal} onClose={() => setCreateModal(false)} title="Post New Notice"
        footer={<>
          <button className="btn btn-ghost" onClick={() => setCreateModal(false)}>Cancel</button>
          <button className="btn btn-primary" onClick={handleCreate} disabled={saving}>{saving ? 'Posting...' : 'Post Notice'}</button>
        </>}
      >
        <div className="form-group">
          <label className="form-label">Title <span className="required">*</span></label>
          <input className="form-input" value={form.title} onChange={e => setForm(f => ({ ...f, title:e.target.value }))} placeholder="Notice title" />
        </div>
        <div className="form-grid-2">
          <div className="form-group">
            <label className="form-label">Category</label>
            <select className="form-select" value={form.category} onChange={e => setForm(f => ({ ...f, category:e.target.value }))}>
              {CATEGORIES.map(c => <option key={c} value={c} style={{ textTransform:'capitalize' }}>{c}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Expiry Date</label>
            <input className="form-input" type="date" value={form.expiryDate} onChange={e => setForm(f => ({ ...f, expiryDate:e.target.value }))} />
          </div>
        </div>
        <div className="form-group">
          <label className="form-label">Content <span className="required">*</span></label>
          <textarea className="form-textarea" rows={5} value={form.content}
            onChange={e => setForm(f => ({ ...f, content:e.target.value }))}
            placeholder="Write notice content here..." />
        </div>
      </Modal>
    </div>
  );
}
