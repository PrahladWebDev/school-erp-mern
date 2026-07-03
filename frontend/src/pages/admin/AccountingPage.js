import React, { useEffect, useState } from 'react';
import { accountingAPI } from '../../api';
import { Card, PageLoader, StatCard, Modal } from '../../components/common';
import toast from 'react-hot-toast';

export default function AccountingPage() {
  const [summary, setSummary] = useState(null);
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ category: 'utilities', description: '', amount: '', date: new Date().toISOString().split('T')[0], paymentMode: 'cash' });

  const load = async () => {
    setLoading(true);
    try {
      const [sumRes, expRes] = await Promise.all([
        accountingAPI.getSummary({}),
        accountingAPI.getExpenses({ limit: 50 })
      ]);
      setSummary(sumRes.data.data);
      setExpenses(expRes.data.data.expenses || []);
    } catch { toast.error('Failed to load accounting data'); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const handleCreate = async () => {
    if (!form.description || !form.amount) return toast.error('Fill all required fields');
    setSaving(true);
    try {
      await accountingAPI.createExpense({ ...form, amount: parseFloat(form.amount) });
      toast.success('Expense recorded!');
      setModal(false);
      setForm({ category: 'utilities', description: '', amount: '', date: new Date().toISOString().split('T')[0], paymentMode: 'cash' });
      load();
    } catch (err) { toast.error(err.response?.data?.message || 'Failed'); }
    finally { setSaving(false); }
  };

  const CATEGORIES = ['utilities', 'salaries', 'maintenance', 'stationery', 'transport', 'events', 'other'];

  if (loading) return <PageLoader />;

  return (
    <div>
      <div className="page-header">
        <div className="page-header-left"><h1>Accounting</h1></div>
        <button className="btn btn-primary" onClick={() => setModal(true)}>+ Record Expense</button>
      </div>

      {summary && (
        <div className="grid-4 mb-5">
          <StatCard icon="💰" label="Total Income" value={`₹${(summary.totalIncome || 0).toLocaleString('en-IN')}`} color="#16a34a" bg="#f0fdf4" />
          <StatCard icon="💸" label="Total Expenses" value={`₹${(summary.totalExpenses || 0).toLocaleString('en-IN')}`} color="#dc2626" bg="#fef2f2" />
          <StatCard icon="📊" label="Net Balance" value={`₹${((summary.totalIncome || 0) - (summary.totalExpenses || 0)).toLocaleString('en-IN')}`} color="#0284c7" bg="#f0f9ff" />
          <StatCard icon="📋" label="Expense Records" value={expenses.length} color="#7c3aed" bg="#f5f3ff" />
        </div>
      )}

      <Card title={`Expenses (${expenses.length})`}>
        {expenses.length === 0
          ? <p style={{ color: 'var(--gray-400)', textAlign: 'center', padding: 40 }}>No expenses recorded yet</p>
          : <div className="table-wrapper"><table>
            <thead><tr><th>Date</th><th>Category</th><th>Description</th><th>Amount</th><th>Payment Mode</th></tr></thead>
            <tbody>
              {expenses.map(exp => (
                <tr key={exp._id}>
                  <td>{new Date(exp.date).toLocaleDateString('en-IN')}</td>
                  <td style={{ textTransform: 'capitalize' }}>{exp.category}</td>
                  <td>{exp.description}</td>
                  <td style={{ fontWeight: 600, color: 'var(--danger)' }}>₹{(exp.amount || 0).toLocaleString('en-IN')}</td>
                  <td style={{ textTransform: 'capitalize' }}>{exp.paymentMode}</td>
                </tr>
              ))}
            </tbody>
          </table></div>
        }
      </Card>

      <Modal isOpen={modal} onClose={() => setModal(false)} title="Record Expense"
        footer={<><button className="btn btn-ghost" onClick={() => setModal(false)}>Cancel</button><button className="btn btn-primary" onClick={handleCreate} disabled={saving}>{saving ? 'Saving...' : 'Record'}</button></>}>
        <div className="form-grid">
          <div className="form-group"><label className="form-label">Category</label>
            <select className="form-select" value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))}>
              {CATEGORIES.map(c => <option key={c} value={c} style={{ textTransform: 'capitalize' }}>{c}</option>)}
            </select>
          </div>
          <div className="form-group"><label className="form-label">Date</label>
            <input className="form-input" type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} />
          </div>
          <div className="form-group" style={{ gridColumn: '1/-1' }}><label className="form-label">Description *</label>
            <input className="form-input" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Expense description" />
          </div>
          <div className="form-group"><label className="form-label">Amount (₹) *</label>
            <input className="form-input" type="number" min="0" value={form.amount} onChange={e => setForm(f => ({ ...f, amount: e.target.value }))} placeholder="0" />
          </div>
          <div className="form-group"><label className="form-label">Payment Mode</label>
            <select className="form-select" value={form.paymentMode} onChange={e => setForm(f => ({ ...f, paymentMode: e.target.value }))}>
              {['cash', 'bank_transfer', 'cheque', 'upi'].map(m => <option key={m} value={m} style={{ textTransform: 'capitalize' }}>{m.replace('_', ' ')}</option>)}
            </select>
          </div>
        </div>
      </Modal>
    </div>
  );
}
