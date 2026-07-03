import React, { useEffect, useState } from 'react';
import { scholarshipAPI } from '../../api';
import { Card, PageLoader, EmptyState, Modal } from '../../components/common';
import toast from 'react-hot-toast';

export default function ScholarshipsPage() {
  const [scholarships, setScholarships] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ name: '', type: 'merit', amount: '', criteria: '', lastDate: '', description: '' });

  const load = async () => {
    setLoading(true);
    try { const { data } = await scholarshipAPI.getAll({}); setScholarships(data.data.scholarships || []); }
    catch { toast.error('Failed to load scholarships'); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const handleCreate = async () => {
    if (!form.name || !form.amount) return toast.error('Name and amount are required');
    setSaving(true);
    try {
      await scholarshipAPI.create({ ...form, amount: parseFloat(form.amount) });
      toast.success('Scholarship created!');
      setModal(false);
      setForm({ name: '', type: 'merit', amount: '', criteria: '', lastDate: '', description: '' });
      load();
    } catch (err) { toast.error(err.response?.data?.message || 'Failed'); }
    finally { setSaving(false); }
  };

  if (loading) return <PageLoader />;

  return (
    <div>
      <div className="page-header">
        <div className="page-header-left"><h1>Scholarships</h1></div>
        <button className="btn btn-primary" onClick={() => setModal(true)}>+ Create Scholarship</button>
      </div>

      {scholarships.length === 0
        ? <EmptyState icon="🎓" title="No scholarships" description="Create scholarships for eligible students" action={<button className="btn btn-primary" onClick={() => setModal(true)}>+ Create Scholarship</button>} />
        : <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {scholarships.map(s => (
            <Card key={s._id}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <h3 style={{ margin: '0 0 6px', fontSize: '1rem', fontWeight: 600 }}>{s.name}</h3>
                  <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
                    <span className="badge badge-primary" style={{ textTransform: 'capitalize' }}>{s.type}</span>
                    {s.isActive ? <span className="badge badge-success">Active</span> : <span className="badge badge-gray">Inactive</span>}
                  </div>
                  <p style={{ color: 'var(--gray-500)', fontSize: '0.875rem', margin: '0 0 4px' }}>{s.description}</p>
                  <div style={{ fontSize: '0.875rem' }}>
                    <strong>Amount:</strong> ₹{(s.amount || 0).toLocaleString('en-IN')} &nbsp;|&nbsp;
                    <strong>Applications:</strong> {s.applications?.length || 0}
                    {s.lastDate && <> &nbsp;|&nbsp; <strong>Last Date:</strong> {new Date(s.lastDate).toLocaleDateString('en-IN')}</>}
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      }

      <Modal isOpen={modal} onClose={() => setModal(false)} title="Create Scholarship"
        footer={<><button className="btn btn-ghost" onClick={() => setModal(false)}>Cancel</button><button className="btn btn-primary" onClick={handleCreate} disabled={saving}>{saving ? 'Saving...' : 'Create'}</button></>}>
        <div className="form-grid">
          <div className="form-group" style={{ gridColumn: '1/-1' }}><label className="form-label">Scholarship Name *</label>
            <input className="form-input" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. Merit Scholarship 2025" />
          </div>
          <div className="form-group"><label className="form-label">Type</label>
            <select className="form-select" value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))}>
              {['merit', 'need_based', 'sports', 'cultural', 'government', 'other'].map(t => <option key={t} value={t} style={{ textTransform: 'capitalize' }}>{t.replace('_', ' ')}</option>)}
            </select>
          </div>
          <div className="form-group"><label className="form-label">Amount (₹) *</label>
            <input className="form-input" type="number" min="0" value={form.amount} onChange={e => setForm(f => ({ ...f, amount: e.target.value }))} />
          </div>
          <div className="form-group"><label className="form-label">Last Date</label>
            <input className="form-input" type="date" value={form.lastDate} onChange={e => setForm(f => ({ ...f, lastDate: e.target.value }))} />
          </div>
          <div className="form-group" style={{ gridColumn: '1/-1' }}><label className="form-label">Criteria</label>
            <input className="form-input" value={form.criteria} onChange={e => setForm(f => ({ ...f, criteria: e.target.value }))} placeholder="Eligibility criteria" />
          </div>
          <div className="form-group" style={{ gridColumn: '1/-1' }}><label className="form-label">Description</label>
            <textarea className="form-input" rows={3} value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
          </div>
        </div>
      </Modal>
    </div>
  );
}
