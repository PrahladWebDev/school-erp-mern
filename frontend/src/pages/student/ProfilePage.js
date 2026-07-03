import React, { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import { studentAPI, authAPI } from '../../api';
import { Card, PageLoader } from '../../components/common';
import toast from 'react-hot-toast';

export default function ProfilePage() {
  const { user } = useSelector(s => s.auth);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [pwForm, setPwForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [changing, setChanging] = useState(false);

  useEffect(() => {
    if (!user?.profileId) { setLoading(false); return; }
    studentAPI.getById(user.profileId)
      .then(r => setProfile(r.data.data.student))
      .catch(() => toast.error('Failed to load profile'))
      .finally(() => setLoading(false));
  }, [user]);

  const handlePasswordChange = async () => {
    if (!pwForm.currentPassword || !pwForm.newPassword) return toast.error('Fill all fields');
    if (pwForm.newPassword !== pwForm.confirmPassword) return toast.error('Passwords do not match');
    setChanging(true);
    try {
      await authAPI.changePassword({ currentPassword: pwForm.currentPassword, newPassword: pwForm.newPassword });
      toast.success('Password changed!');
      setPwForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch (err) { toast.error(err.response?.data?.message || 'Failed'); }
    finally { setChanging(false); }
  };

  if (loading) return <PageLoader />;

  const Row = ({ label, value }) => (
    <div style={{ display: 'flex', padding: '10px 0', borderBottom: '1px solid var(--gray-100)' }}>
      <span style={{ width: 160, color: 'var(--gray-500)', fontSize: '0.875rem', flexShrink: 0 }}>{label}</span>
      <span style={{ fontWeight: 500, fontSize: '0.875rem' }}>{value || '—'}</span>
    </div>
  );

  return (
    <div>
      <div className="page-header">
        <div className="page-header-left"><h1>My Profile</h1></div>
      </div>

      {profile ? (
        <>
          <Card title="Personal Information">
            <Row label="Name" value={`${profile.firstName} ${profile.lastName || ''}`} />
            <Row label="Admission No." value={profile.admissionNumber} />
            <Row label="Class" value={`${profile.class?.name || ''} ${profile.section ? '- ' + profile.section : ''}`} />
            <Row label="Academic Year" value={profile.academicYear} />
            <Row label="Gender" value={profile.gender} />
            <Row label="Date of Birth" value={profile.dateOfBirth ? new Date(profile.dateOfBirth).toLocaleDateString('en-IN') : '—'} />
            <Row label="Blood Group" value={profile.bloodGroup} />
            <Row label="Category" value={profile.category} />
            <Row label="Mobile" value={profile.mobile} />
            <Row label="Email" value={profile.email} />
          </Card>

          {profile.guardians?.length > 0 && (
            <Card title="Guardian Information" className="mt-4">
              {profile.guardians.map((g, i) => (
                <div key={i}>
                  <Row label="Name" value={g.name} />
                  <Row label="Relation" value={g.relation} />
                  <Row label="Mobile" value={g.mobile} />
                </div>
              ))}
            </Card>
          )}
        </>
      ) : (
        <Card title="Profile"><p style={{ color: 'var(--gray-400)' }}>Profile not found</p></Card>
      )}

      <Card title="Change Password" className="mt-4">
        <div className="form-grid">
          <div className="form-group" style={{ gridColumn: '1/-1' }}>
            <label className="form-label">Current Password</label>
            <input className="form-input" type="password" value={pwForm.currentPassword} onChange={e => setPwForm(f => ({ ...f, currentPassword: e.target.value }))} />
          </div>
          <div className="form-group">
            <label className="form-label">New Password</label>
            <input className="form-input" type="password" value={pwForm.newPassword} onChange={e => setPwForm(f => ({ ...f, newPassword: e.target.value }))} />
          </div>
          <div className="form-group">
            <label className="form-label">Confirm Password</label>
            <input className="form-input" type="password" value={pwForm.confirmPassword} onChange={e => setPwForm(f => ({ ...f, confirmPassword: e.target.value }))} />
          </div>
        </div>
        <button className="btn btn-primary mt-4" onClick={handlePasswordChange} disabled={changing}>
          {changing ? 'Changing...' : 'Change Password'}
        </button>
      </Card>
    </div>
  );
}
