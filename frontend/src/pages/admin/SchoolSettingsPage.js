import React, { useEffect, useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { schoolAPI, authAPI } from '../../api';
import { Card, PageLoader } from '../../components/common';
import { fetchMe } from '../../store/slices/authSlice';
import toast from 'react-hot-toast';

export default function SchoolSettingsPage() {
  const { school } = useSelector(s => s.auth);
  const dispatch = useDispatch();
  const [form, setForm] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [pwForm, setPwForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [changingPw, setChangingPw] = useState(false);

  useEffect(() => {
    schoolAPI.getMySchool()
      .then(r => {
        const s = r.data.data.school;
        setForm({
          name: s.name || '', shortName: s.shortName || '', type: s.type || 'primary',
          board: s.board || 'State Board', medium: s.medium || 'Hindi',
          phone: s.phone || '', email: s.email || '', website: s.website || '',
          primaryColor: s.primaryColor || '#1a56db',
          'address.line1': s.address?.line1 || '', 'address.village': s.address?.village || '',
          'address.district': s.address?.district || '', 'address.state': s.address?.state || '',
          'address.pincode': s.address?.pincode || '',
        });
      })
      .catch(() => toast.error('Failed to load settings'))
      .finally(() => setLoading(false));
  }, []);

  const set = (key, val) => setForm(f => ({ ...f, [key]: val }));

  const handleSave = async () => {
    setSaving(true);
    const payload = { ...form };
    // Reconstruct nested address
    payload.address = {
      line1: form['address.line1'], village: form['address.village'],
      district: form['address.district'], state: form['address.state'], pincode: form['address.pincode']
    };
    ['address.line1', 'address.village', 'address.district', 'address.state', 'address.pincode'].forEach(k => delete payload[k]);
    try {
      await schoolAPI.updateSchool(payload);
      toast.success('Settings saved!');
      dispatch(fetchMe());
    } catch (err) { toast.error(err.response?.data?.message || 'Failed'); }
    finally { setSaving(false); }
  };

  const handleChangePw = async () => {
    if (!pwForm.currentPassword || !pwForm.newPassword) return toast.error('Fill all fields');
    if (pwForm.newPassword !== pwForm.confirmPassword) return toast.error('Passwords do not match');
    setChangingPw(true);
    try {
      await authAPI.changePassword({ currentPassword: pwForm.currentPassword, newPassword: pwForm.newPassword });
      toast.success('Password changed!');
      setPwForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch (err) { toast.error(err.response?.data?.message || 'Failed'); }
    finally { setChangingPw(false); }
  };

  if (loading) return <PageLoader />;

  const F = ({ label, k, type = 'text', options, col }) => (
    <div className="form-group" style={col ? { gridColumn: col } : {}}>
      <label className="form-label">{label}</label>
      {options
        ? <select className="form-select" value={form[k] || ''} onChange={e => set(k, e.target.value)}>
          {options.map(o => <option key={o.value || o} value={o.value || o}>{o.label || o}</option>)}
        </select>
        : <input className="form-input" type={type} value={form[k] || ''} onChange={e => set(k, e.target.value)} />
      }
    </div>
  );

  return (
    <div>
      <div className="page-header">
        <div className="page-header-left"><h1>School Settings</h1></div>
        <button className="btn btn-primary" onClick={handleSave} disabled={saving}>{saving ? 'Saving...' : 'Save Changes'}</button>
      </div>

      <Card title="Basic Information">
        <div className="form-grid">
          <F label="School Name" k="name" col="1/-1" />
          <F label="Short Name" k="shortName" />
          <F label="Type" k="type" options={[{value:'primary',label:'Primary'},{value:'secondary',label:'Secondary'},{value:'higher_secondary',label:'Higher Secondary'},{value:'coaching',label:'Coaching'},{value:'college',label:'College'},{value:'other',label:'Other'}]} />
          <F label="Board" k="board" options={['CBSE','ICSE','State Board','IB','NIOS','Other']} />
          <F label="Medium" k="medium" />
          <F label="Phone" k="phone" />
          <F label="Email" k="email" type="email" />
          <F label="Website" k="website" col="1/-1" />
        </div>
      </Card>

      <Card title="Address" className="mt-4">
        <div className="form-grid">
          <F label="Address Line 1" k="address.line1" col="1/-1" />
          <F label="Village" k="address.village" />
          <F label="District" k="address.district" />
          <F label="State" k="address.state" />
          <F label="Pincode" k="address.pincode" />
        </div>
      </Card>

      <Card title="Change Password" className="mt-4">
        <div className="form-grid">
          <div className="form-group" style={{ gridColumn: '1/-1' }}><label className="form-label">Current Password</label>
            <input className="form-input" type="password" value={pwForm.currentPassword} onChange={e => setPwForm(f => ({ ...f, currentPassword: e.target.value }))} />
          </div>
          <div className="form-group"><label className="form-label">New Password</label>
            <input className="form-input" type="password" value={pwForm.newPassword} onChange={e => setPwForm(f => ({ ...f, newPassword: e.target.value }))} />
          </div>
          <div className="form-group"><label className="form-label">Confirm Password</label>
            <input className="form-input" type="password" value={pwForm.confirmPassword} onChange={e => setPwForm(f => ({ ...f, confirmPassword: e.target.value }))} />
          </div>
        </div>
        <button className="btn btn-primary mt-4" onClick={handleChangePw} disabled={changingPw}>{changingPw ? 'Changing...' : 'Change Password'}</button>
      </Card>
    </div>
  );
}
