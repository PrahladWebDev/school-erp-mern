import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { superAdminAPI } from '../../api';
import { Card } from '../../components/common';
import { LocationPickerMap } from '../../components/common';
import toast from 'react-hot-toast';

export default function CreateSchool() {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    name:'', type:'primary', board:'State Board', medium:'Hindi',
    email:'', phone:'',
    address:{ line1:'', village:'', taluka:'', district:'', state:'Maharashtra', pincode:'' },
    adminName:'', adminEmail:'', adminMobile:'', adminPassword:'', subscriptionPlan:'basic',
    location:{ lat:'', lng:'' },
    logo:{ url:'' }
  });
  const [saving, setSaving] = useState(false);
  const [step, setStep] = useState(1);

  const set = (key, val) => setForm(f => ({ ...f, [key]: val }));
  const setAddr = (key, val) => setForm(f => ({ ...f, address:{ ...f.address, [key]:val } }));
  const setLoc = (key, val) => setForm(f => ({ ...f, location:{ ...f.location, [key]:val } }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name || !form.adminEmail || !form.adminPassword) return toast.error('Fill all required fields');
    setSaving(true);
    try {
      const { data } = await superAdminAPI.createSchool(form);
      toast.success(`School "${data.data.school.name}" created! Code: ${data.data.school.schoolCode}`);
      navigate('/super-admin/schools');
    } catch (err) { toast.error(err.response?.data?.message || 'Failed to create school'); }
    finally { setSaving(false); }
  };

  const inputRow = (label, key, type='text', required=false, placeholder='') => (
    <div className="form-group">
      <label className="form-label">{label}{required && <span className="required"> *</span>}</label>
      <input className="form-input" type={type} placeholder={placeholder}
        value={form[key] || ''} onChange={e => set(key, e.target.value)} required={required} />
    </div>
  );

  return (
    <div>
      <div className="page-header">
        <div className="page-header-left"><h1>Create New School</h1></div>
        <button className="btn btn-ghost" onClick={() => navigate('/super-admin/schools')}>← Back</button>
      </div>
      <form onSubmit={handleSubmit}>
        <div className="grid-2">
          <Card title="School Information">
            {inputRow('School Name','name','text',true,'e.g. Gram Vidyalaya')}
            <div className="form-grid-2">
              <div className="form-group">
                <label className="form-label">School Type</label>
                <select className="form-select" value={form.type} onChange={e => set('type',e.target.value)}>
                  {['primary','secondary','higher_secondary','coaching','college','other'].map(t =>
                    <option key={t} value={t}>{t.replace('_',' ')}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Board</label>
                <select className="form-select" value={form.board} onChange={e => set('board',e.target.value)}>
                  {['CBSE','ICSE','State Board','IB','NIOS','Other'].map(b => <option key={b}>{b}</option>)}
                </select>
              </div>
            </div>
            {inputRow('Medium of Instruction','medium','text',false,'Hindi / English / Marathi')}
            {inputRow('School Email','email','email',true,'school@example.com')}
            {inputRow('Phone Number','phone','tel',false,'9876543210')}
          </Card>

          <Card title="School Address">
            {inputRow('Address Line 1','line1','text',false,'Street / Ward no.')}
            <div className="form-grid-2">
              {[['village','Village/City'],['taluka','Taluka'],['district','District'],['state','State'],['pincode','Pincode']].map(([k,l]) => (
                <div key={k} className="form-group">
                  <label className="form-label">{l}</label>
                  <input className="form-input" value={form.address[k]} onChange={e => setAddr(k, e.target.value)} />
                </div>
              ))}
            </div>
          </Card>

          <Card title="Admin Account">
            {inputRow('Admin Full Name','adminName','text',true,'Ramesh Patil')}
            {inputRow('Admin Email','adminEmail','email',true,'admin@school.com')}
            <div className="form-grid-2">
              {inputRow('Admin Mobile','adminMobile','tel',true,'9876543210')}
              {inputRow('Login Password','adminPassword','password',true,'Min 8 characters')}
            </div>
          </Card>

          <Card title="Location & Branding">
            <div style={{ marginBottom: 10, fontSize: '0.8rem', color: 'var(--gray-500)' }}>
              Search for a place or click on the map to set the school's location for the Explore Map.
            </div>
            <LocationPickerMap
              lat={form.location.lat}
              lng={form.location.lng}
              onChange={({ lat, lng }) => setForm(f => ({ ...f, location: { lat, lng } }))}
            />
            <div className="form-group" style={{ marginTop: 14 }}>
              <label className="form-label">School Logo URL</label>
              <input className="form-input" type="url" placeholder="https://example.com/logo.png"
                value={form.logo.url} onChange={e => setForm(f => ({ ...f, logo:{ url: e.target.value } }))} />
              {form.logo.url && (
                <div style={{ marginTop: 8 }}>
                  <img src={form.logo.url} alt="Logo preview" style={{ height: 60, width: 60, objectFit: 'cover', borderRadius: '50%', border: '2px solid var(--gray-200)' }} onError={e => e.target.style.display='none'} />
                </div>
              )}
            </div>
          </Card>

          <Card title="Subscription Plan">
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
              {[
                { plan:'free',       label:'Free',       price:'₹0',   max:'50 students',  color:'#6b7280' },
                { plan:'basic',      label:'Basic',      price:'₹499', max:'200 students', color:'#0284c7' },
                { plan:'standard',   label:'Standard',   price:'₹999', max:'500 students', color:'#16a34a' },
                { plan:'premium',    label:'Premium',    price:'₹1999',max:'2000 students',color:'#7c3aed' },
              ].map(p => (
                <div key={p.plan} onClick={() => set('subscriptionPlan', p.plan)}
                  style={{
                    border:`2px solid ${form.subscriptionPlan === p.plan ? p.color : 'var(--gray-200)'}`,
                    borderRadius:10, padding:14, cursor:'pointer',
                    background: form.subscriptionPlan === p.plan ? p.color+'10' : '#fff',
                    transition:'all 0.15s',
                  }}>
                  <div style={{ fontWeight:700, color:p.color }}>{p.label}</div>
                  <div style={{ fontSize:'1.1rem', fontWeight:600, margin:'4px 0' }}>{p.price}/mo</div>
                  <div style={{ fontSize:'0.75rem', color:'var(--gray-400)' }}>{p.max}</div>
                </div>
              ))}
            </div>
          </Card>
        </div>

        <div style={{ display:'flex', gap:12, justifyContent:'flex-end', marginTop:24 }}>
          <button type="button" className="btn btn-ghost" onClick={() => navigate('/super-admin/schools')}>Cancel</button>
          <button type="submit" className="btn btn-primary btn-lg" disabled={saving}>
            {saving ? '⏳ Creating...' : '🏫 Create School'}
          </button>
        </div>
      </form>
    </div>
  );
}
