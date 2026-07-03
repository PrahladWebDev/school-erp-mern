import React, { useEffect, useState, useCallback } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { studentAPI, teacherAPI, parentAPI, authAPI } from '../../api';
import { Card, PageLoader } from '../../components/common';
import { fetchMe } from '../../store/slices/authSlice';
import toast from 'react-hot-toast';

// ─── Theme palettes ──────────────────────────────────────────────────────────
const THEMES = [
  {
    id: 'default',
    label: 'Ocean Blue',
    primary: '#1e3a5f', primaryLight: '#2d5282', primaryDark: '#142a47',
    accent: '#f5a623', sidebar: '#1e3a5f',
  },
  {
    id: 'emerald',
    label: 'Emerald',
    primary: '#065f46', primaryLight: '#047857', primaryDark: '#064e3b',
    accent: '#fbbf24', sidebar: '#065f46',
  },
  {
    id: 'violet',
    label: 'Violet',
    primary: '#4c1d95', primaryLight: '#6d28d9', primaryDark: '#3b0764',
    accent: '#f59e0b', sidebar: '#4c1d95',
  },
  {
    id: 'rose',
    label: 'Rose',
    primary: '#881337', primaryLight: '#be123c', primaryDark: '#4c0519',
    accent: '#f97316', sidebar: '#881337',
  },
  {
    id: 'slate',
    label: 'Slate',
    primary: '#1e293b', primaryLight: '#334155', primaryDark: '#0f172a',
    accent: '#38bdf8', sidebar: '#1e293b',
  },
];

const FONT_SIZES = [
  { id: 'sm',  label: 'Small',   size: '14px' },
  { id: 'md',  label: 'Medium',  size: '16px' },
  { id: 'lg',  label: 'Large',   size: '18px' },
];

// ─── Apply theme to document ──────────────────────────────────────────────────
export function applyTheme(settings) {
  const root = document.documentElement;
  const theme = THEMES.find(t => t.id === settings.theme) || THEMES[0];
  root.style.setProperty('--primary',       theme.primary);
  root.style.setProperty('--primary-light', theme.primaryLight);
  root.style.setProperty('--primary-dark',  theme.primaryDark);
  root.style.setProperty('--accent',        theme.accent);

  const fontSize = FONT_SIZES.find(f => f.id === settings.fontSize) || FONT_SIZES[1];
  root.style.setProperty('font-size', fontSize.size);

  if (settings.darkMode) {
    root.setAttribute('data-theme', 'dark');
  } else {
    root.removeAttribute('data-theme');
  }
}

// ─── Load saved settings from localStorage (per-user) ───────────────────────
export function loadAppSettings(userId) {
  try {
    const key = userId ? `appSettings_${userId}` : 'appSettings';
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : { theme: 'default', darkMode: false, fontSize: 'md', compactSidebar: false };
  } catch { return { theme: 'default', darkMode: false, fontSize: 'md', compactSidebar: false }; }
}

// ─── Info row ─────────────────────────────────────────────────────────────────
const Row = ({ label, value }) => (
  <div style={{ display: 'flex', padding: '10px 0', borderBottom: '1px solid var(--gray-100)' }}>
    <span style={{ width: 180, color: 'var(--gray-500)', fontSize: '0.875rem', flexShrink: 0 }}>{label}</span>
    <span style={{ fontWeight: 500, fontSize: '0.875rem', textTransform: 'capitalize' }}>{value || '—'}</span>
  </div>
);

// ─── Toggle switch ────────────────────────────────────────────────────────────
const Toggle = ({ checked, onChange, label }) => (
  <label style={{ display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer' }}>
    <div
      onClick={() => onChange(!checked)}
      style={{
        width: 44, height: 24, borderRadius: 12, cursor: 'pointer', transition: 'background 0.2s',
        background: checked ? 'var(--primary)' : 'var(--gray-300)', position: 'relative', flexShrink: 0,
      }}
    >
      <div style={{
        position: 'absolute', top: 3, left: checked ? 23 : 3,
        width: 18, height: 18, borderRadius: '50%', background: '#fff',
        transition: 'left 0.2s', boxShadow: '0 1px 3px rgba(0,0,0,.2)',
      }} />
    </div>
    <span style={{ fontSize: '0.875rem', color: 'var(--gray-700)' }}>{label}</span>
  </label>
);

export default function ProfileSettingsPage() {
  const dispatch = useDispatch();
  const { user } = useSelector(s => s.auth);
  const role = user?.role;

  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('profile');

  // App settings state (per-user)
  const [appSettings, setAppSettings] = useState(() => loadAppSettings(user?._id));

  // Edit profile state
  const [editForm, setEditForm] = useState({ name: '', mobile: '' });
  const [saving, setSaving] = useState(false);

  // Change password state
  const [pwForm, setPwForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [changingPw, setChangingPw] = useState(false);
  const [showPw, setShowPw] = useState({ cur: false, new: false, con: false });

  // ── Load profile data based on role ───────────────────────────────────────
  useEffect(() => {
    const load = async () => {
      try {
        if (role === 'student' && user?.profileId) {
          const r = await studentAPI.getById(user.profileId);
          setProfile(r.data.data.student);
        } else if (role === 'teacher' && user?.profileId) {
          const r = await teacherAPI.getById(user.profileId);
          setProfile(r.data.data.teacher);
        } else if (role === 'parent') {
          const r = await parentAPI.getChildren();
          setProfile({ children: r.data.data.children || [] });
        }
      } catch {
        // Profile optional – auth user info is enough
      } finally {
        setLoading(false);
      }
    };
    load();
    setEditForm({ name: user?.name || '', mobile: user?.mobile || '' });
  }, [user, role]);

  // ── Apply theme whenever appSettings change ───────────────────────────────
  useEffect(() => {
    applyTheme(appSettings);
    const key = user?._id ? `appSettings_${user._id}` : 'appSettings';
    localStorage.setItem(key, JSON.stringify(appSettings));
  }, [appSettings, user?._id]);

  const setSetting = useCallback((key, val) => {
    setAppSettings(prev => ({ ...prev, [key]: val }));
  }, []);

  // ── Save profile ──────────────────────────────────────────────────────────
  const handleSaveProfile = async () => {
    if (!editForm.name.trim()) return toast.error('Name is required');
    setSaving(true);
    try {
      await authAPI.updateProfile({ name: editForm.name, mobile: editForm.mobile });
      dispatch(fetchMe());
      toast.success('Profile updated!');
    } catch (err) { toast.error(err.response?.data?.message || 'Failed to update'); }
    finally { setSaving(false); }
  };

  // ── Change password ───────────────────────────────────────────────────────
  const handleChangePassword = async () => {
    if (!pwForm.currentPassword || !pwForm.newPassword) return toast.error('Fill all fields');
    if (pwForm.newPassword.length < 8) return toast.error('Password must be at least 8 characters');
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

  const roleColors = {
    super_admin: '#f5a623', school_admin: '#16a34a',
    teacher: '#0284c7', parent: '#7c3aed', student: '#dc2626',
  };
  const roleLabels = {
    super_admin: 'Super Admin', school_admin: 'School Admin',
    teacher: 'Teacher', parent: 'Parent', student: 'Student',
  };
  const initials = user?.name?.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() || 'U';
  const color = roleColors[role] || '#1e3a5f';

  const TABS = [
    { key: 'profile',  label: '👤 Profile' },
    { key: 'account',  label: '🔒 Account' },
    { key: 'theme',    label: '🎨 Appearance' },
    { key: 'settings', label: '⚙️ App Settings' },
  ];

  return (
    <div>
      <div className="page-header">
        <div className="page-header-left"><h1>Profile & Settings</h1></div>
      </div>

      {/* Avatar hero */}
      <Card>
        <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
          <div style={{
            width: 72, height: 72, borderRadius: '50%', flexShrink: 0,
            background: color, color: '#fff', fontSize: '1.6rem',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontWeight: 700, boxShadow: `0 4px 16px ${color}40`,
          }}>
            {user?.avatar?.url
              ? <img src={user.avatar.url} alt="avatar" style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }} />
              : initials
            }
          </div>
          <div>
            <div style={{ fontWeight: 700, fontSize: '1.2rem' }}>{user?.name}</div>
            <div style={{ marginTop: 4, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <span style={{ background: `${color}18`, color, fontSize: '0.75rem', fontWeight: 600, padding: '2px 10px', borderRadius: 20 }}>
                {roleLabels[role]}
              </span>
              {user?.email && (
                <span style={{ color: 'var(--gray-500)', fontSize: '0.8rem' }}>{user.email}</span>
              )}
            </div>
          </div>
        </div>
      </Card>

      {/* Tab nav */}
      <div style={{ display: 'flex', gap: 4, marginTop: 20, marginBottom: 4, background: 'var(--gray-100)', borderRadius: 12, padding: 4 }}>
        {TABS.map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            style={{
              flex: 1, padding: '9px 12px', borderRadius: 9, fontWeight: 600,
              fontSize: '0.8rem', border: 'none', cursor: 'pointer', transition: 'all 0.2s',
              background: tab === t.key ? '#fff' : 'transparent',
              color: tab === t.key ? 'var(--primary)' : 'var(--gray-500)',
              boxShadow: tab === t.key ? 'var(--shadow-sm)' : 'none',
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* ── TAB: Profile ── */}
      {tab === 'profile' && (
        <>
          {/* Role-specific info */}
          {role === 'student' && profile && (
            <Card title="Student Information" className="mt-4">
              <Row label="Admission No." value={profile.admissionNumber} />
              <Row label="Class" value={`${profile.class?.name || ''} ${profile.section ? '· ' + profile.section : ''}`} />
              <Row label="Academic Year" value={profile.academicYear} />
              <Row label="Gender" value={profile.gender} />
              <Row label="Date of Birth" value={profile.dateOfBirth ? new Date(profile.dateOfBirth).toLocaleDateString('en-IN') : null} />
              <Row label="Blood Group" value={profile.bloodGroup} />
              <Row label="Category" value={profile.category} />
              <Row label="Mobile" value={profile.mobile} />
              {profile.guardians?.length > 0 && (
                <>
                  <div style={{ fontWeight: 600, fontSize: '0.85rem', color: 'var(--gray-600)', marginTop: 16, marginBottom: 4 }}>Guardian</div>
                  <Row label="Name" value={profile.guardians[0].name} />
                  <Row label="Relation" value={profile.guardians[0].relation} />
                  <Row label="Mobile" value={profile.guardians[0].mobile} />
                </>
              )}
            </Card>
          )}

          {role === 'teacher' && profile && (
            <Card title="Teacher Information" className="mt-4">
              <Row label="Employee ID" value={profile.employeeId} />
              <Row label="Designation" value={profile.designation?.replace(/_/g, ' ')} />
              <Row label="Department" value={profile.department} />
              <Row label="Qualification" value={profile.qualification} />
              <Row label="Experience" value={profile.experience != null ? `${profile.experience} years` : null} />
              <Row label="Employment Type" value={profile.employmentType?.replace(/_/g, ' ')} />
              <Row label="Joining Date" value={profile.joiningDate ? new Date(profile.joiningDate).toLocaleDateString('en-IN') : null} />
              <Row label="Subjects" value={profile.subjects?.join(', ')} />
              <Row label="Mobile" value={profile.mobile} />
              <Row label="Gender" value={profile.gender} />
            </Card>
          )}

          {role === 'parent' && profile && (
            <Card title="Children" className="mt-4">
              {profile.children.length === 0
                ? <p style={{ color: 'var(--gray-400)', fontSize: '0.875rem' }}>No linked children found.</p>
                : profile.children.map((c, i) => (
                  <div key={c._id} style={{ padding: '10px 0', borderBottom: i < profile.children.length - 1 ? '1px solid var(--gray-100)' : 'none' }}>
                    <div style={{ fontWeight: 600 }}>{c.firstName} {c.lastName}</div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--gray-500)', marginTop: 2 }}>
                      {c.class?.name} {c.section ? `· ${c.section}` : ''} &nbsp;·&nbsp; Adm: {c.admissionNumber}
                    </div>
                  </div>
                ))
              }
            </Card>
          )}

          {(role === 'school_admin' || role === 'super_admin') && (
            <Card title="Account Information" className="mt-4">
              <Row label="Name" value={user?.name} />
              <Row label="Email" value={user?.email} />
              <Row label="Mobile" value={user?.mobile} />
              <Row label="Role" value={roleLabels[role]} />
            </Card>
          )}

          {/* Editable details for all roles */}
          <Card title="Edit Profile" className="mt-4">
            <div className="form-grid">
              <div className="form-group">
                <label className="form-label">Full Name <span className="required">*</span></label>
                <input className="form-input" value={editForm.name}
                  onChange={e => setEditForm(f => ({ ...f, name: e.target.value }))} />
              </div>
              <div className="form-group">
                <label className="form-label">Mobile</label>
                <input className="form-input" value={editForm.mobile} placeholder="10-digit"
                  onChange={e => setEditForm(f => ({ ...f, mobile: e.target.value }))} />
              </div>
            </div>
            <button className="btn btn-primary mt-4" onClick={handleSaveProfile} disabled={saving}>
              {saving ? 'Saving...' : '💾 Save Changes'}
            </button>
          </Card>
        </>
      )}

      {/* ── TAB: Account / Security ── */}
      {tab === 'account' && (
        <Card title="Change Password" className="mt-4">
          <div style={{ maxWidth: 420 }}>
            {[
              { key: 'currentPassword', label: 'Current Password', show: showPw.cur, toggle: () => setShowPw(p => ({ ...p, cur: !p.cur })) },
              { key: 'newPassword',     label: 'New Password',     show: showPw.new, toggle: () => setShowPw(p => ({ ...p, new: !p.new })) },
              { key: 'confirmPassword', label: 'Confirm New Password', show: showPw.con, toggle: () => setShowPw(p => ({ ...p, con: !p.con })) },
            ].map(f => (
              <div className="form-group" key={f.key}>
                <label className="form-label">{f.label}</label>
                <div style={{ position: 'relative' }}>
                  <input
                    className="form-input"
                    type={f.show ? 'text' : 'password'}
                    value={pwForm[f.key]}
                    style={{ paddingRight: 42 }}
                    onChange={e => setPwForm(p => ({ ...p, [f.key]: e.target.value }))}
                  />
                  <button type="button" onClick={f.toggle} style={{
                    position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)',
                    background: 'none', border: 'none', cursor: 'pointer', fontSize: '1rem', color: 'var(--gray-400)',
                  }}>{f.show ? '🙈' : '👁️'}</button>
                </div>
              </div>
            ))}
            <p style={{ fontSize: '0.78rem', color: 'var(--gray-400)', marginBottom: 12 }}>
              Minimum 8 characters. Use a mix of letters, numbers & symbols.
            </p>
            <button className="btn btn-primary" onClick={handleChangePassword} disabled={changingPw}>
              {changingPw ? 'Changing...' : '🔒 Change Password'}
            </button>
          </div>
        </Card>
      )}

      {/* ── TAB: Appearance / Theme ── */}
      {tab === 'theme' && (
        <>
          <Card title="Color Theme" className="mt-4">
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))', gap: 12 }}>
              {THEMES.map(t => (
                <button
                  key={t.id}
                  onClick={() => setSetting('theme', t.id)}
                  style={{
                    border: appSettings.theme === t.id ? `2.5px solid ${t.primary}` : '2px solid var(--gray-200)',
                    borderRadius: 12, padding: 12, cursor: 'pointer', background: '#fff',
                    boxShadow: appSettings.theme === t.id ? `0 0 0 3px ${t.primary}25` : 'none',
                    transition: 'all 0.2s', textAlign: 'center',
                  }}
                >
                  <div style={{ display: 'flex', gap: 4, justifyContent: 'center', marginBottom: 8 }}>
                    <div style={{ width: 20, height: 20, borderRadius: 6, background: t.primary }} />
                    <div style={{ width: 20, height: 20, borderRadius: 6, background: t.accent }} />
                    <div style={{ width: 20, height: 20, borderRadius: 6, background: t.primaryLight }} />
                  </div>
                  <div style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--gray-700)' }}>{t.label}</div>
                  {appSettings.theme === t.id && (
                    <div style={{ marginTop: 4, fontSize: '0.7rem', color: t.primary, fontWeight: 700 }}>✓ Active</div>
                  )}
                </button>
              ))}
            </div>
          </Card>

          <Card title="Dark Mode" className="mt-4">
            <Toggle
              checked={appSettings.darkMode}
              onChange={v => setSetting('darkMode', v)}
              label="Enable dark mode"
            />
            <p style={{ marginTop: 8, fontSize: '0.78rem', color: 'var(--gray-400)' }}>
              Switches the app to a darker color palette, easier on the eyes at night.
            </p>
          </Card>

          <Card title="Font Size" className="mt-4">
            <div style={{ display: 'flex', gap: 10 }}>
              {FONT_SIZES.map(f => (
                <button
                  key={f.id}
                  onClick={() => setSetting('fontSize', f.id)}
                  style={{
                    flex: 1, padding: '10px 8px', borderRadius: 10, cursor: 'pointer',
                    border: appSettings.fontSize === f.id ? '2px solid var(--primary)' : '2px solid var(--gray-200)',
                    background: appSettings.fontSize === f.id ? 'var(--primary)' : '#fff',
                    color: appSettings.fontSize === f.id ? '#fff' : 'var(--gray-700)',
                    fontWeight: 600, fontSize: f.size, transition: 'all 0.2s',
                  }}
                >
                  Aa
                  <div style={{ fontSize: '0.7rem', marginTop: 2, opacity: 0.8 }}>{f.label}</div>
                </button>
              ))}
            </div>
          </Card>
        </>
      )}

      {/* ── TAB: App Settings ── */}
      {tab === 'settings' && (
        <>
          <Card title="Navigation" className="mt-4">
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <Toggle
                checked={appSettings.compactSidebar}
                onChange={v => setSetting('compactSidebar', v)}
                label="Compact sidebar (collapsed by default)"
              />
            </div>
          </Card>

          <Card title="Notifications" className="mt-4">
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <Toggle
                checked={appSettings.notifSound ?? true}
                onChange={v => setSetting('notifSound', v)}
                label="Notification sound"
              />
              <Toggle
                checked={appSettings.notifBadge ?? true}
                onChange={v => setSetting('notifBadge', v)}
                label="Show unread badge on sidebar icon"
              />
            </div>
          </Card>

          <Card title="Language" className="mt-4">
            <div className="form-group" style={{ maxWidth: 220 }}>
              <label className="form-label">Display Language</label>
              <select
                className="form-select"
                value={appSettings.language || 'en'}
                onChange={e => setSetting('language', e.target.value)}
              >
                <option value="en">English</option>
                <option value="hi">हिंदी (Hindi)</option>
                <option value="mr">मराठी (Marathi)</option>
              </select>
            </div>
            <p style={{ fontSize: '0.78rem', color: 'var(--gray-400)', marginTop: 6 }}>
              UI language switching coming soon. Currently only English is fully supported.
            </p>
          </Card>

          <Card title="Data & Privacy" className="mt-4">
            <div style={{ fontSize: '0.875rem', color: 'var(--gray-600)', lineHeight: 1.7 }}>
              <p>Your data is stored securely on your school's server. Settings like theme and font size are saved locally in your browser.</p>
              <button
                className="btn btn-ghost btn-sm"
                style={{ marginTop: 12, color: 'var(--danger)' }}
                onClick={() => {
                  const key = user?._id ? `appSettings_${user._id}` : 'appSettings';
                  localStorage.removeItem(key);
                  setAppSettings({ theme: 'default', darkMode: false, fontSize: 'md', compactSidebar: false });
                  toast.success('Settings reset to default');
                }}
              >
                🗑️ Reset all settings to default
              </button>
            </div>
          </Card>
        </>
      )}
    </div>
  );
}
