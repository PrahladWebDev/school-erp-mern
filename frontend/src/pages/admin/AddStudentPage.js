import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { studentAPI, classAPI } from '../../api';
import { Card, Modal } from '../../components/common';
import toast from 'react-hot-toast';

export default function AddStudentPage() {
  const navigate = useNavigate();
  const { school } = useSelector(s => s.auth);
  const [classes, setClasses] = useState([]);
  const [saving, setSaving] = useState(false);
  const [credsModal, setCredsModal] = useState(null);
  const [photoFile, setPhotoFile] = useState(null);
  const [photoPreview, setPhotoPreview] = useState(null);
  const photoRef = useRef();
  const [form, setForm] = useState({
    firstName:'', lastName:'', gender:'', dateOfBirth:'', bloodGroup:'Unknown',
    aadharNumber:'', mobileNumber:'', email:'',
    class:'', section:'', academicYear: '', rollNumber:'',
    category:'General', religion:'', admissionDate: new Date().toISOString().split('T')[0],
    guardians:[{ relation:'father', name:'', mobile:'', occupation:'' }],
    address:{ current:{ line1:'', village:'', taluka:'', district:'', state:'Maharashtra', pincode:'' }, sameAsCurrent:true },
    emergencyContact:{ name:'', relation:'', mobile:'' },
  });

  useEffect(() => {
    classAPI.getAll({ academicYear: school?.currentAcademicYear })
      .then(r => setClasses(r.data.data.classes || []));
    setForm(f => ({ ...f, academicYear: school?.currentAcademicYear || '' }));
  }, [school]);

  const set = (key, val) => setForm(f => ({ ...f, [key]: val }));
  const setGuardian = (idx, key, val) => setForm(f => {
    const g = [...f.guardians]; g[idx] = { ...g[idx], [key]: val }; return { ...f, guardians: g };
  });

  const handlePhotoChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setPhotoFile(file);
    setPhotoPreview(URL.createObjectURL(file));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.firstName || !form.gender || !form.dateOfBirth || !form.class) {
      return toast.error('Please fill all required fields');
    }
    setSaving(true);
    try {
      const { data } = await studentAPI.create(form);
      const student = data.data.student;
      const creds = data.data.loginCredentials || [];

      // Upload photo if selected
      if (photoFile) {
        try {
          const fd = new FormData();
          fd.append('photo', photoFile);
          await studentAPI.uploadPhoto(student._id, fd);
        } catch (photoErr) {
          toast.error('Student created but photo upload failed');
        }
      }

      toast.success(`Student admitted! Admission No: ${student.admissionNumber}`);
      if (creds.length > 0) {
        setCredsModal({ admissionNumber: student.admissionNumber, name: `${student.firstName} ${student.lastName || ''}`, creds });
      } else {
        navigate('/admin/students');
      }
    } catch (err) { toast.error(err.response?.data?.message || 'Failed to admit student'); }
    finally { setSaving(false); }
  };

  const field = (label, key, type='text', required=false, placeholder='') => (
    <div className="form-group">
      <label className="form-label">{label}{required && <span className="required"> *</span>}</label>
      <input className="form-input" type={type} placeholder={placeholder} required={required}
        value={form[key] || ''} onChange={e => set(key, e.target.value)} />
    </div>
  );

  return (
    <div>
      <div className="page-header">
        <div className="page-header-left"><h1>Admit New Student</h1></div>
        <button className="btn btn-ghost" onClick={() => navigate('/admin/students')}>← Back</button>
      </div>

      <form onSubmit={handleSubmit}>
        <div style={{ display:'flex', flexDirection:'column', gap:20 }}>

          {/* Photo Upload */}
          <Card title="Student Photo">
            <div style={{ display:'flex', alignItems:'center', gap:20 }}>
              <div
                onClick={() => photoRef.current.click()}
                style={{
                  width:100, height:100, borderRadius:'50%', cursor:'pointer',
                  background:'var(--gray-100)', border:'2px dashed var(--gray-300)',
                  display:'flex', alignItems:'center', justifyContent:'center',
                  overflow:'hidden', flexShrink:0
                }}>
                {photoPreview
                  ? <img src={photoPreview} alt="Preview" style={{ width:'100%', height:'100%', objectFit:'cover' }} />
                  : <span style={{ fontSize:32 }}>📷</span>}
              </div>
              <div>
                <p style={{ fontWeight:600, marginBottom:4 }}>Upload Student Photo</p>
                <p style={{ fontSize:'0.8rem', color:'var(--gray-500)', marginBottom:8 }}>JPG, PNG or WebP. Max 2MB. Face will be auto-cropped.</p>
                <button type="button" className="btn btn-ghost btn-sm" onClick={() => photoRef.current.click()}>
                  {photoPreview ? '🔄 Change Photo' : '📤 Choose Photo'}
                </button>
                {photoPreview && (
                  <button type="button" className="btn btn-ghost btn-sm" style={{ marginLeft:8, color:'var(--danger)' }}
                    onClick={() => { setPhotoFile(null); setPhotoPreview(null); photoRef.current.value = ''; }}>
                    ✕ Remove
                  </button>
                )}
              </div>
              <input ref={photoRef} type="file" accept="image/jpeg,image/png,image/webp"
                style={{ display:'none' }} onChange={handlePhotoChange} />
            </div>
          </Card>
          <Card title="Personal Information">
            <div className="form-grid-3">
              {field('First Name','firstName','text',true,'Ramesh')}
              {field('Last Name','lastName','text',false,'Patil')}
              <div className="form-group">
                <label className="form-label">Gender <span className="required">*</span></label>
                <select className="form-select" required value={form.gender} onChange={e => set('gender',e.target.value)}>
                  <option value="">Select</option>
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                  <option value="other">Other</option>
                </select>
              </div>
              {field('Date of Birth','dateOfBirth','date',true)}
              <div className="form-group">
                <label className="form-label">Blood Group</label>
                <select className="form-select" value={form.bloodGroup} onChange={e => set('bloodGroup',e.target.value)}>
                  {['A+','A-','B+','B-','O+','O-','AB+','AB-','Unknown'].map(b => <option key={b}>{b}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Category</label>
                <select className="form-select" value={form.category} onChange={e => set('category',e.target.value)}>
                  {['General','OBC','SC','ST','NT','Other'].map(c => <option key={c}>{c}</option>)}
                </select>
              </div>
              {field('Aadhaar Number','aadharNumber','text',false,'12-digit number')}
              {field('Mobile Number','mobileNumber','tel',false,'Student mobile')}
              {field('Email','email','email',false,'student@email.com')}
            </div>
          </Card>

          {/* Academic */}
          <Card title="Academic Details">
            <div className="form-grid-3">
              <div className="form-group">
                <label className="form-label">Class <span className="required">*</span></label>
                <select className="form-select" required value={form.class} onChange={e => set('class',e.target.value)}>
                  <option value="">Select Class</option>
                  {classes.map(c => <option key={c._id} value={c._id}>{c.name}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Section</label>
                <select className="form-select" value={form.section} onChange={e => set('section',e.target.value)}>
                  <option value="">Select Section</option>
                  {(classes.find(c => c._id === form.class)?.sections || []).map(s =>
                    <option key={s} value={s}>Section {s}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Academic Year</label>
                <input className="form-input" value={form.academicYear} onChange={e => set('academicYear',e.target.value)} placeholder="2024-2025" />
              </div>
              {field('Roll Number','rollNumber','text',false,'Auto-assigned if empty')}
              {field('Admission Date','admissionDate','date')}
            </div>
          </Card>

          {/* Guardian */}
          <Card title="Parent / Guardian Information">
            {form.guardians.map((g, i) => (
              <div key={i} style={{ padding:'12px 0', borderBottom: i < form.guardians.length-1 ? '1px dashed var(--gray-200)':'' }}>
                <div style={{ fontWeight:600, fontSize:'0.875rem', marginBottom:10, textTransform:'capitalize', color:'var(--primary)' }}>
                  {g.relation}
                </div>
                <div className="form-grid-3">
                  <div className="form-group">
                    <label className="form-label">Relation <span className="required">*</span></label>
                    <select className="form-select" value={g.relation} onChange={e => setGuardian(i,'relation',e.target.value)}>
                      <option value="father">Father</option>
                      <option value="mother">Mother</option>
                      <option value="guardian">Guardian</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Full Name <span className="required">*</span></label>
                    <input className="form-input" value={g.name} onChange={e => setGuardian(i,'name',e.target.value)} placeholder="Parent name" required />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Mobile</label>
                    <input className="form-input" type="tel" value={g.mobile} onChange={e => setGuardian(i,'mobile',e.target.value)} placeholder="10-digit mobile" />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Occupation</label>
                    <input className="form-input" value={g.occupation} onChange={e => setGuardian(i,'occupation',e.target.value)} placeholder="Farmer / Teacher..." />
                  </div>
                </div>
              </div>
            ))}
            <button type="button" className="btn btn-ghost btn-sm mt-4"
              onClick={() => setForm(f => ({ ...f, guardians:[...f.guardians, { relation:'mother', name:'', mobile:'', occupation:'' }] }))}>
              + Add Guardian
            </button>
          </Card>

          {/* Address */}
          <Card title="Address">
            <div className="form-grid-3">
              {['line1','village','taluka','district','state','pincode'].map(k => (
                <div key={k} className="form-group">
                  <label className="form-label" style={{ textTransform:'capitalize' }}>{k.replace('line1','Address Line')}</label>
                  <input className="form-input"
                    value={form.address.current[k]}
                    onChange={e => setForm(f => ({ ...f, address:{ ...f.address, current:{ ...f.address.current, [k]:e.target.value } } }))} />
                </div>
              ))}
            </div>
          </Card>
        </div>

        <div style={{ display:'flex', gap:12, justifyContent:'flex-end', marginTop:24 }}>
          <button type="button" className="btn btn-ghost" onClick={() => navigate('/admin/students')}>Cancel</button>
          <button type="submit" className="btn btn-primary btn-lg" disabled={saving}>
            {saving ? '⏳ Admitting...' : '👨‍🎓 Admit Student'}
          </button>
        </div>
      </form>

      {/* Login Credentials Modal */}
      <Modal isOpen={!!credsModal} onClose={() => { setCredsModal(null); navigate('/admin/students'); }}
        title="✅ Student Admitted — Login Credentials"
        footer={<button className="btn btn-primary" onClick={() => { setCredsModal(null); navigate('/admin/students'); }}>Done</button>}>
        {credsModal && (
          <div>
            <div style={{ marginBottom: 16, padding: 12, background: '#f0fdf4', borderRadius: 8, border: '1px solid #bbf7d0' }}>
              <strong>{credsModal.name}</strong> has been admitted successfully.<br />
              <span style={{ fontSize: '0.875rem', color: 'var(--gray-500)' }}>Admission No: {credsModal.admissionNumber}</span>
            </div>
            <p style={{ fontWeight: 600, marginBottom: 12 }}>🔑 Login credentials generated:</p>
            {credsModal.creds.map((c, i) => (
              <div key={i} style={{ background: 'var(--gray-50)', borderRadius: 8, padding: 14, marginBottom: 10, border: '1px solid var(--gray-200)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                  <span className={`badge badge-${c.role === 'student' ? 'primary' : 'success'}`}>{c.role.charAt(0).toUpperCase() + c.role.slice(1)}</span>
                  {c.name && <span style={{ fontSize: '0.875rem', color: 'var(--gray-600)' }}>{c.name} ({c.relation})</span>}
                </div>
                <div style={{ fontSize: '0.875rem' }}>
                  <div>📧 <strong>Email:</strong> <code style={{ background: '#fff', padding: '2px 8px', borderRadius: 4, border: '1px solid var(--gray-200)' }}>{c.email}</code></div>
                  <div style={{ marginTop: 4 }}>🔒 <strong>Password:</strong> <code style={{ background: '#fff', padding: '2px 8px', borderRadius: 4, border: '1px solid var(--gray-200)', color: 'var(--primary)' }}>{c.password}</code></div>
                </div>
              </div>
            ))}
            <p style={{ fontSize: '0.8rem', color: 'var(--danger)', marginTop: 12 }}>
              ⚠️ Save these passwords now. They won't be shown again.
            </p>
            <button className="btn btn-ghost w-full mt-2" onClick={() => {
              const text = credsModal.creds.map(c => `${c.role.toUpperCase()}\nEmail: ${c.email}\nPassword: ${c.password}`).join('\n\n');
              navigator.clipboard?.writeText(text);
              toast.success('Copied to clipboard!');
            }}>📋 Copy All Credentials</button>
          </div>
        )}
      </Modal>
    </div>
  );
}
