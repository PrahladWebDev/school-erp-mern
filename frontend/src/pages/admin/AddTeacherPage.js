import React, { useRef, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { teacherAPI } from '../../api';
import { Card, Modal } from '../../components/common';
import toast from 'react-hot-toast';

// Field component defined OUTSIDE of AddTeacherPage so it's stable across renders
// (if defined inside, React unmounts/remounts it on every keystroke, losing focus)
const Field = ({ label, fieldKey, value, onChange, type = 'text', options, col, required, placeholder }) => (
  <div className="form-group" style={col ? { gridColumn: col } : {}}>
    <label className="form-label">{label}{required && <span className="required"> *</span>}</label>
    {options
      ? <select className="form-select" value={value || ''} onChange={e => onChange(fieldKey, e.target.value)}>
        <option value="">Select</option>
        {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
      : <input className="form-input" type={type} value={value || ''} placeholder={placeholder}
          onChange={e => onChange(fieldKey, e.target.value)} />
    }
  </div>
);

const AddressField = ({ label, fieldKey, value, onChange }) => (
  <div className="form-group">
    <label className="form-label" style={{ textTransform: 'capitalize' }}>{label}</label>
    <input className="form-input" value={value || ''} onChange={e => onChange(fieldKey, e.target.value)} />
  </div>
);

export default function AddTeacherPage() {
  const navigate = useNavigate();
  const [saving, setSaving] = useState(false);
  const [credsModal, setCredsModal] = useState(null);
  const [photoFile, setPhotoFile] = useState(null);
  const [photoPreview, setPhotoPreview] = useState(null);
  const photoRef = useRef();
  const [form, setForm] = useState({
    firstName: '', lastName: '', gender: '', dateOfBirth: '',
    mobile: '', email: '', aadharNumber: '',
    employeeId: '', designation: 'teacher', department: '',
    joiningDate: new Date().toISOString().split('T')[0],
    qualification: '', experience: '', basicSalary: '',
    subjects: '', status: 'active', employmentType: 'permanent',
    address: { line1: '', village: '', district: '', state: 'Maharashtra', pincode: '' }
  });

  const handleFieldChange = useCallback((key, value) => {
    setForm(f => ({ ...f, [key]: value }));
  }, []);

  const handleAddressChange = useCallback((key, value) => {
    setForm(f => ({ ...f, address: { ...f.address, [key]: value } }));
  }, []);

  const handlePhotoChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setPhotoFile(file);
    setPhotoPreview(URL.createObjectURL(file));
  };

  const handleSubmit = async () => {
    if (!form.firstName || !form.mobile || !form.designation || !form.gender || !form.qualification || !form.joiningDate) {
      return toast.error('Fill all required fields (Name, Gender, Mobile, Qualification, Designation, Joining Date)');
    }
    setSaving(true);
    try {
      const payload = { ...form };
      if (form.subjects) payload.subjects = form.subjects.split(',').map(s => s.trim()).filter(Boolean);
      if (form.basicSalary) payload.basicSalary = parseFloat(form.basicSalary);
      if (form.experience) payload.experience = parseInt(form.experience);
      Object.keys(payload).forEach(k => payload[k] === '' && delete payload[k]);

      const { data } = await teacherAPI.create(payload);
      const teacher = data.data.teacher;

      if (photoFile) {
        try {
          const fd = new FormData();
          fd.append('photo', photoFile);
          await teacherAPI.uploadPhoto(teacher._id, fd);
        } catch { toast.error('Teacher created but photo upload failed'); }
      }

      toast.success('Teacher added successfully!');
      if (form.email) {
        setCredsModal({
          name: `${form.firstName} ${form.lastName || ''}`.trim(),
          email: form.email,
          password: data.data.password || null,
        });
      } else {
        navigate('/admin/teachers');
      }
    } catch (err) { toast.error(err.response?.data?.message || 'Failed to add teacher'); }
    finally { setSaving(false); }
  };

  return (
    <div>
      <div className="page-header">
        <div className="page-header-left"><h1>Add Teacher</h1></div>
        <div style={{ display: 'flex', gap: 12 }}>
          <button className="btn btn-ghost" onClick={() => navigate(-1)}>Cancel</button>
          <button className="btn btn-primary" onClick={handleSubmit} disabled={saving}>
            {saving ? 'Adding...' : 'Add Teacher'}
          </button>
        </div>
      </div>

      {/* Photo */}
      <Card title="Teacher Photo">
        <div style={{ display:'flex', alignItems:'center', gap:20 }}>
          <div onClick={() => photoRef.current.click()} style={{
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
            <p style={{ fontWeight:600, marginBottom:4 }}>Upload Teacher Photo</p>
            <p style={{ fontSize:'0.8rem', color:'var(--gray-500)', marginBottom:8 }}>JPG, PNG or WebP. Max 2MB.</p>
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

      {/* Personal */}
      <Card title="Personal Information" className="mt-4">
        <div className="form-grid">
          <Field label="First Name" fieldKey="firstName" value={form.firstName} onChange={handleFieldChange} required />
          <Field label="Last Name" fieldKey="lastName" value={form.lastName} onChange={handleFieldChange} />
          <Field label="Gender" fieldKey="gender" value={form.gender} onChange={handleFieldChange} required options={[
            { value: 'male', label: 'Male' },
            { value: 'female', label: 'Female' },
            { value: 'other', label: 'Other' },
          ]} />
          <Field label="Date of Birth" fieldKey="dateOfBirth" value={form.dateOfBirth} onChange={handleFieldChange} type="date" />
          <Field label="Mobile" fieldKey="mobile" value={form.mobile} onChange={handleFieldChange} required placeholder="10-digit mobile" />
          <Field label="Email" fieldKey="email" value={form.email} onChange={handleFieldChange} type="email" placeholder="teacher@email.com" />
          <Field label="Aadhaar Number" fieldKey="aadharNumber" value={form.aadharNumber} onChange={handleFieldChange} placeholder="12-digit" />
          <Field label="Blood Group" fieldKey="bloodGroup" value={form.bloodGroup} onChange={handleFieldChange} options={[
            'A+','A-','B+','B-','AB+','AB-','O+','O-'
          ].map(v => ({ value: v, label: v }))} />
        </div>
        {/* Address */}
        <div style={{ marginTop: 16 }}>
          <p style={{ fontWeight: 600, fontSize: '0.85rem', marginBottom: 10, color: 'var(--gray-600)' }}>Address</p>
          <div className="form-grid">
            <AddressField label="Address Line" fieldKey="line1" value={form.address.line1} onChange={handleAddressChange} />
            <AddressField label="Village" fieldKey="village" value={form.address.village} onChange={handleAddressChange} />
            <AddressField label="District" fieldKey="district" value={form.address.district} onChange={handleAddressChange} />
            <AddressField label="State" fieldKey="state" value={form.address.state} onChange={handleAddressChange} />
            <AddressField label="Pincode" fieldKey="pincode" value={form.address.pincode} onChange={handleAddressChange} />
          </div>
        </div>
      </Card>

      {/* Professional */}
      <Card title="Professional Details" className="mt-4">
        <div className="form-grid">
          <Field label="Employee ID" fieldKey="employeeId" value={form.employeeId} onChange={handleFieldChange} placeholder="Auto-generated if blank" />
          <Field label="Designation" fieldKey="designation" value={form.designation} onChange={handleFieldChange} required options={[
            { value: 'principal', label: 'Principal' },
            { value: 'vice_principal', label: 'Vice Principal' },
            { value: 'head_teacher', label: 'Head Teacher' },
            { value: 'teacher', label: 'Teacher' },
            { value: 'assistant_teacher', label: 'Assistant Teacher' },
            { value: 'peon', label: 'Peon' },
            { value: 'other', label: 'Other' },
          ]} />
          <Field label="Employment Type" fieldKey="employmentType" value={form.employmentType} onChange={handleFieldChange} options={[
            { value: 'permanent', label: 'Permanent' },
            { value: 'contract', label: 'Contract' },
            { value: 'part_time', label: 'Part Time' },
            { value: 'guest', label: 'Guest' },
          ]} />
          <Field label="Department" fieldKey="department" value={form.department} onChange={handleFieldChange} placeholder="e.g. Science, Arts" />
          <Field label="Joining Date" fieldKey="joiningDate" value={form.joiningDate} onChange={handleFieldChange} type="date" required />
          <Field label="Qualification" fieldKey="qualification" value={form.qualification} onChange={handleFieldChange} required placeholder="e.g. B.Ed, M.Sc" />
          <Field label="Experience (years)" fieldKey="experience" value={form.experience} onChange={handleFieldChange} type="number" placeholder="0" />
          <Field label="Basic Salary (₹)" fieldKey="basicSalary" value={form.basicSalary} onChange={handleFieldChange} type="number" placeholder="0" />
          <div className="form-group" style={{ gridColumn: '1/-1' }}>
            <label className="form-label">Subjects Taught</label>
            <input className="form-input" value={form.subjects} placeholder="Comma-separated e.g. Mathematics, Science"
              onChange={e => handleFieldChange('subjects', e.target.value)} />
          </div>
        </div>
      </Card>

      {/* Credentials Modal */}
      <Modal isOpen={!!credsModal} onClose={() => { setCredsModal(null); navigate('/admin/teachers'); }}
        title="✅ Teacher Added — Login Credentials"
        footer={<button className="btn btn-primary" onClick={() => { setCredsModal(null); navigate('/admin/teachers'); }}>Done</button>}>
        {credsModal && (
          <div>
            <div style={{ marginBottom: 16, padding: 12, background: '#f0fdf4', borderRadius: 8, border: '1px solid #bbf7d0' }}>
              <strong>{credsModal.name}</strong> has been added successfully.
            </div>
            <p style={{ fontWeight: 600, marginBottom: 12 }}>🔑 Login credentials:</p>
            <div style={{ background: 'var(--gray-50)', borderRadius: 8, padding: 14, border: '1px solid var(--gray-200)' }}>
              <span className="badge badge-primary" style={{ marginBottom: 10, display: 'inline-block' }}>Teacher</span>
              <div style={{ fontSize: '0.875rem' }}>
                <div>📧 <strong>Email:</strong> <code style={{ background: '#fff', padding: '2px 8px', borderRadius: 4, border: '1px solid var(--gray-200)' }}>{credsModal.email}</code></div>
                {credsModal.password && (
                  <div style={{ marginTop: 4 }}>🔒 <strong>Password:</strong> <code style={{ background: '#fff', padding: '2px 8px', borderRadius: 4, border: '1px solid var(--gray-200)', color: 'var(--primary)' }}>{credsModal.password}</code></div>
                )}
              </div>
            </div>
            {credsModal.password && (
              <button className="btn btn-ghost w-full mt-2" onClick={() => {
                navigator.clipboard?.writeText(`Email: ${credsModal.email}\nPassword: ${credsModal.password}`);
                toast.success('Copied!');
              }}>📋 Copy Credentials</button>
            )}
            <p style={{ fontSize: '0.8rem', color: 'var(--danger)', marginTop: 8 }}>
              ⚠️ Save this password now. Use "Reset Login" on the teacher profile to regenerate if lost.
            </p>
          </div>
        )}
      </Modal>
    </div>
  );
}
