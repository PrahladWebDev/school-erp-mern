import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { superAdminAPI } from '../../api';
import { Card, PageLoader } from '../../components/common';
import { LocationPickerMap } from '../../components/common';
import toast from 'react-hot-toast';

export default function EditSchoolPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading]   = useState(true);
  const [saving,  setSaving]    = useState(false);
  const [form,    setForm]      = useState({});
  const [dbInfo,  setDbInfo]    = useState({ dbName: '', schoolCode: '' });

  useEffect(() => {
    superAdminAPI.getSchoolById(id)
      .then(r => {
        const s = r.data.data.school;
        setDbInfo({ dbName: s.dbName, schoolCode: s.schoolCode });
        setForm({
          name:               s.name               || '',
          shortName:          s.shortName           || '',
          type:               s.type               || 'primary',
          board:              s.board              || 'State Board',
          medium:             s.medium             || 'Hindi',
          phone:              s.phone              || '',
          email:              s.email              || '',
          website:            s.website            || '',
          primaryColor:       s.primaryColor       || '#1a56db',
          'address.line1':    s.address?.line1     || '',
          'address.village':  s.address?.village   || '',
          'address.district': s.address?.district  || '',
          'address.state':    s.address?.state     || '',
          'address.pincode':  s.address?.pincode   || '',
          'location.lat':     s.location?.lat      || '',
          'location.lng':     s.location?.lng      || '',
          'logo.url':         s.logo?.url          || '',
        });
      })
      .catch(() => toast.error('Failed to load school'))
      .finally(() => setLoading(false));
  }, [id]);

  const set = (key, val) => setForm(f => ({ ...f, [key]: val }));

  const handleSave = async () => {
    setSaving(true);
    const payload = { ...form };
    payload.address = {
      line1:    form['address.line1'],
      village:  form['address.village'],
      district: form['address.district'],
      state:    form['address.state'],
      pincode:  form['address.pincode'],
    };
    ['address.line1','address.village','address.district','address.state','address.pincode']
      .forEach(k => delete payload[k]);

    if (form['location.lat'] && form['location.lng']) {
      payload.location = { lat: parseFloat(form['location.lat']), lng: parseFloat(form['location.lng']) };
    }
    delete payload['location.lat'];
    delete payload['location.lng'];

    if (form['logo.url']) {
      payload.logo = { url: form['logo.url'] };
    }
    delete payload['logo.url'];

    try {
      const { data } = await superAdminAPI.updateSchool(id, payload);
      const updated = data.data.school;
      // Refresh dbInfo in case schoolCode / dbName changed
      setDbInfo({ dbName: updated.dbName, schoolCode: updated.schoolCode });
      toast.success('School updated & DB cache refreshed!');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save');
    } finally {
      setSaving(false);
    }
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
        <div className="page-header-left">
          <h1>Edit School</h1>
          <p style={{ fontSize: '0.8rem', color: 'var(--gray-400)', marginTop: 4 }}>
            DB: <code style={{ background: 'var(--gray-100)', padding: '2px 6px', borderRadius: 4 }}>{dbInfo.dbName}</code>
            &nbsp;·&nbsp;Code: <code style={{ background: 'var(--gray-100)', padding: '2px 6px', borderRadius: 4 }}>{dbInfo.schoolCode}</code>
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn btn-outline" onClick={() => navigate('/super-admin/schools')}>← Back</button>
          <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>

      {/* Info banner */}
      <div style={{
        background: 'var(--primary-bg, #eff6ff)',
        border: '1px solid var(--primary, #1a56db)',
        borderRadius: 8,
        padding: '10px 16px',
        marginBottom: 20,
        fontSize: '0.85rem',
        color: 'var(--primary, #1a56db)',
      }}>
        ℹ️ Changing the <strong>School Name</strong> will automatically update the database name and flush the connection cache — no stale data will appear.
      </div>

      <Card title="Basic Information">
        <div className="form-grid">
          <F label="School Name" k="name" col="1/-1" />
          <F label="Short Name" k="shortName" />
          <F label="Type" k="type" options={[
            { value: 'primary',          label: 'Primary' },
            { value: 'secondary',        label: 'Secondary' },
            { value: 'higher_secondary', label: 'Higher Secondary' },
            { value: 'coaching',         label: 'Coaching' },
            { value: 'college',          label: 'College' },
            { value: 'other',            label: 'Other' },
          ]} />
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

      <Card title="Location & Branding" className="mt-4">
        <div style={{ marginBottom: 10, fontSize: '0.8rem', color: 'var(--gray-500)' }}>
          Search for a place or click on the map to update the school's pin on Explore Map.
        </div>
        <LocationPickerMap
          lat={form['location.lat'] ? parseFloat(form['location.lat']) : ''}
          lng={form['location.lng'] ? parseFloat(form['location.lng']) : ''}
          onChange={({ lat, lng }) => setForm(f => ({ ...f, 'location.lat': lat, 'location.lng': lng }))}
        />
        <div className="form-group" style={{ marginTop: 14 }}>
          <label className="form-label">Logo URL</label>
          <input className="form-input" type="url" value={form['logo.url'] || ''} onChange={e => set('logo.url', e.target.value)} placeholder="https://example.com/logo.png" />
          {form['logo.url'] && (
            <div style={{ marginTop: 8 }}>
              <img src={form['logo.url']} alt="Logo" style={{ height: 60, width: 60, objectFit: 'cover', borderRadius: '50%', border: '2px solid var(--gray-200)' }} onError={e => e.target.style.display='none'} />
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}
