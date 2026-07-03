import React, { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate, Link } from 'react-router-dom';
import { loginUser, clearError } from '../../store/slices/authSlice';
import toast from 'react-hot-toast';

const ROLE_REDIRECTS = {
  super_admin:  '/super-admin/dashboard',
  school_admin: '/admin/dashboard',
  teacher:      '/teacher/dashboard',
  parent:       '/parent/dashboard',
  student:      '/student/dashboard',
};

export default function LoginPage() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { loading, error, isAuthenticated, user } = useSelector(s => s.auth);

  const [form, setForm] = useState({ email: '', password: '' });
  const [showPwd, setShowPwd] = useState(false);

  useEffect(() => {
    if (isAuthenticated && user) {
      navigate(ROLE_REDIRECTS[user.role] || '/dashboard', { replace: true });
    }
  }, [isAuthenticated, user, navigate]);

  useEffect(() => {
    if (error) { toast.error(error); dispatch(clearError()); }
  }, [error, dispatch]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.email || !form.password) return toast.error('Email and password are required');
    dispatch(loginUser(form));
  };

  return (
    <div style={{
      minHeight: '100vh', display: 'flex',
      background: 'linear-gradient(135deg, var(--primary-dark) 0%, var(--primary) 50%, var(--primary-light) 100%)',
    }}>
      {/* Left panel — branding */}
      <div className="login-brand" style={{
        flex: 1, display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        padding: 48, color: '#fff',
      }}>
        <div style={{ fontSize: '4rem', marginBottom: 16 }}>🏫</div>
        <h1 style={{ fontSize: '2.2rem', fontWeight: 800, marginBottom: 12, color: '#fff' }}>
          School ERP
        </h1>
        <p style={{ color: 'rgba(255,255,255,.7)', textAlign: 'center', maxWidth: 320, lineHeight: 1.7 }}>
          Complete School Management System for Rural & Private Schools
        </p>
        <div style={{ marginTop: 40, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, maxWidth: 320 }}>
          {[
            { icon: '👨‍🎓', label: 'Students' }, { icon: '👩‍🏫', label: 'Teachers' },
            { icon: '💰', label: 'Fees' },        { icon: '📊', label: 'Reports' },
            { icon: '✅', label: 'Attendance' },  { icon: '📋', label: 'Exams' },
          ].map(f => (
            <div key={f.label} style={{
              background: 'rgba(255,255,255,.1)', borderRadius: 10,
              padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 10,
              color: '#fff', fontSize: '0.875rem', fontWeight: 500,
            }}>
              <span style={{ fontSize: '1.2rem' }}>{f.icon}</span>{f.label}
            </div>
          ))}
        </div>
      </div>

      {/* Right panel — login form */}
      <div style={{
        width: '100%', maxWidth: 460, background: '#fff',
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        padding: 48, borderRadius: '24px 0 0 24px',
      }}>
        <div style={{ width: '100%', maxWidth: 360 }}>
          <Link to="/" style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            fontSize: '0.8rem', color: 'var(--gray-400)', marginBottom: 24,
            textDecoration: 'none',
          }}>
            ← Back to home
          </Link>

          <div style={{ textAlign: 'center', marginBottom: 36 }}>
            <div style={{
              width: 56, height: 56, background: 'var(--primary)', borderRadius: 14,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '1.6rem', margin: '0 auto 16px',
            }}>🏫</div>
            <h2 style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--gray-900)' }}>Welcome back</h2>
            <p style={{ color: 'var(--gray-500)', fontSize: '0.875rem', marginTop: 4 }}>
              Sign in to your account
            </p>
          </div>

          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label className="form-label">Email Address <span className="required">*</span></label>
              <input
                className="form-input" type="email" placeholder="you@school.com"
                value={form.email} autoComplete="email" required
                onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Password <span className="required">*</span></label>
              <div style={{ position: 'relative' }}>
                <input
                  className="form-input" type={showPwd ? 'text' : 'password'}
                  placeholder="Enter your password" value={form.password}
                  autoComplete="current-password" required style={{ paddingRight: 44 }}
                  onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                />
                <button type="button" onClick={() => setShowPwd(v => !v)} style={{
                  position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)',
                  background: 'none', border: 'none', cursor: 'pointer',
                  fontSize: '1rem', color: 'var(--gray-400)',
                }}>
                  {showPwd ? '🙈' : '👁️'}
                </button>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 20, marginTop: -8 }}>
              <Link to="/forgot-password" style={{ fontSize: '0.8rem', color: 'var(--primary)' }}>
                Forgot password?
              </Link>
            </div>

            <button type="submit" className="btn btn-primary w-full" disabled={loading}
              style={{ justifyContent: 'center', padding: '12px', fontSize: '0.95rem' }}>
              {loading
                ? <><div className="spinner" style={{ width: 16, height: 16, borderWidth: 2 }} /> Signing in...</>
                : 'Sign In'}
            </button>
          </form>

          {/* Demo credentials — Super Admin only */}
          <div style={{ marginTop: 28, padding: 16, background: 'var(--gray-50)', borderRadius: 12, border: '1px solid var(--gray-200)' }}>
            <p style={{ fontSize: '0.72rem', color: 'var(--gray-400)', marginBottom: 10, textAlign: 'center', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Demo Credentials
            </p>

            {/* Super Admin */}
            <button
              onClick={() => setForm({ email: 'superadmin@schoolerp.com', password: 'SuperAdmin@123' })}
              style={{
                width: '100%', background: '#fff', border: '1.5px solid #f5a62330',
                borderRadius: 10, padding: '10px 14px', cursor: 'pointer',
                textAlign: 'left', transition: 'all 0.15s',
                display: 'flex', alignItems: 'center', gap: 10,
              }}
            >
              <div style={{
                width: 34, height: 34, borderRadius: 8, background: '#fffbeb',
                display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1rem',
              }}>👑</div>
              <div>
                <div style={{ fontSize: '0.78rem', fontWeight: 700, color: '#d97706' }}>Super Admin</div>
                <div style={{ fontSize: '0.7rem', color: 'var(--gray-400)', marginTop: 1 }}>superadmin@schoolerp.com</div>
              </div>
              <div style={{ marginLeft: 'auto', fontSize: '0.65rem', color: 'var(--gray-300)', fontFamily: 'monospace' }}>
                SuperAdmin@123
              </div>
            </button>

            <p style={{ fontSize: '0.65rem', color: 'var(--gray-300)', marginTop: 10, textAlign: 'center', lineHeight: 1.5 }}>
              School admin, teacher, student & parent accounts are created from the Super Admin panel and receive their credentials directly.
            </p>
          </div>
        </div>
      </div>

      <style>{`
        @media (max-width: 768px) {
          .login-brand { display: none !important; }
          div[style*="maxWidth: 460"] { border-radius: 0 !important; padding: 32px 24px !important; }
        }
      `}</style>
    </div>
  );
}
