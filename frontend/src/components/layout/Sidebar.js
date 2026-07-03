import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { logoutUser } from '../../store/slices/authSlice';
import { loadAppSettings } from '../../pages/shared/ProfileSettingsPage';
import toast from 'react-hot-toast';

// ─── Nav configs per role ─────────────────────────────────────────────────────
const NAV = {
  super_admin: [
    { section: 'Main', items: [
      { to: '/super-admin/dashboard',    icon: '📊', label: 'Dashboard' },
      { to: '/super-admin/schools',      icon: '🏫', label: 'Schools' },
      { to: '/super-admin/explore-map',  icon: '🗺️', label: 'Explore Map' },
    ]},
    { section: 'Account', items: [
      { to: '/super-admin/profile',      icon: '👤', label: 'Profile & Settings' },
    ]},
  ],
  school_admin: [
    { section: 'Overview', items: [
      { to: '/admin/dashboard',  icon: '📊', label: 'Dashboard' },
    ]},
    { section: 'People', items: [
      { to: '/admin/students',         icon: '👨‍🎓', label: 'Students' },
      { to: '/admin/students/promote', icon: '🎓',  label: 'Promote Students' },
      { to: '/admin/students/id-cards',icon: '🪪',  label: 'ID Cards' },
      { to: '/admin/teachers',         icon: '👩‍🏫', label: 'Teachers' },
      { to: '/admin/classes',          icon: '🏛️',  label: 'Classes' },
    ]},
    { section: 'Academic', items: [
      { to: '/admin/timetable',  icon: '📅', label: 'Timetable' },
      { to: '/admin/attendance', icon: '✅', label: 'Attendance' },
      { to: '/admin/homework',   icon: '📝', label: 'Homework' },
      { to: '/admin/leaves',     icon: '🌿', label: 'Leaves' },
    ]},
    { section: 'Exams & Results', items: [
      { to: '/admin/exams',      icon: '📋', label: 'Exams' },
      { to: '/admin/results',    icon: '🏆', label: 'Results' },
    ]},
    { section: 'Finance', items: [
      { to: '/admin/fees',        icon: '💰', label: 'Fees' },
      { to: '/admin/accounting',  icon: '📒', label: 'Accounting' },
      { to: '/admin/scholarships',icon: '🎓', label: 'Scholarships' },
    ]},
    { section: 'Communication', items: [
      { to: '/admin/notices',       icon: '📢', label: 'Notice Board' },
      { to: '/admin/notifications', icon: '🔔', label: 'Notifications' },
    ]},
    { section: 'Settings', items: [
      { to: '/admin/settings', icon: '⚙️', label: 'School Settings' },
      { to: '/admin/profile',  icon: '👤', label: 'Profile & Settings' },
    ]},
  ],
  teacher: [
    { section: 'Overview', items: [
      { to: '/teacher/dashboard',  icon: '📊', label: 'Dashboard' },
    ]},
    { section: 'Classroom', items: [
      { to: '/teacher/attendance', icon: '✅', label: 'Take Attendance' },
      { to: '/teacher/homework',   icon: '📝', label: 'Homework' },
      { to: '/teacher/timetable',  icon: '📅', label: 'Timetable' },
    ]},
    { section: 'Exams', items: [
      { to: '/teacher/exams',   icon: '📋', label: 'Exams' },
      { to: '/teacher/results', icon: '🏆', label: 'Results' },
    ]},
    { section: 'Other', items: [
      { to: '/teacher/leaves',        icon: '🌿', label: 'Leave Requests' },
      { to: '/teacher/notices',       icon: '📢', label: 'Notices' },
      { to: '/teacher/notifications', icon: '🔔', label: 'Notifications' },
      { to: '/teacher/profile',       icon: '👤', label: 'Profile & Settings' },
    ]},
  ],
  parent: [
    { section: 'Main', items: [
      { to: '/parent/dashboard',     icon: '📊', label: 'Dashboard' },
      { to: '/parent/attendance',    icon: '✅', label: "Child's Attendance" },
      { to: '/parent/fees',          icon: '💰', label: 'Fee Status' },
      { to: '/parent/results',       icon: '🏆', label: 'Results' },
      { to: '/parent/homework',      icon: '📝', label: 'Homework' },
      { to: '/parent/notices',       icon: '📢', label: 'Notices' },
      { to: '/parent/notifications', icon: '🔔', label: 'Notifications' },
      { to: '/parent/profile',       icon: '👤', label: 'Profile & Settings' },
    ]},
  ],
  student: [
    { section: 'Main', items: [
      { to: '/student/dashboard',     icon: '📊', label: 'Dashboard' },
      { to: '/student/attendance',    icon: '✅', label: 'My Attendance' },
      { to: '/student/fees',          icon: '💰', label: 'My Fees' },
      { to: '/student/results',       icon: '🏆', label: 'My Results' },
      { to: '/student/homework',      icon: '📝', label: 'Homework' },
      { to: '/student/timetable',     icon: '📅', label: 'Timetable' },
      { to: '/student/leaves',        icon: '🌿', label: 'Apply Leave' },
      { to: '/student/notices',       icon: '📢', label: 'Notices' },
      { to: '/student/notifications', icon: '🔔', label: 'Notifications' },
      { to: '/student/profile',       icon: '👤', label: 'Profile & Settings' },
    ]},
  ],
};

const ROLE_COLORS = {
  super_admin: '#f5a623', school_admin: '#16a34a',
  teacher: '#0284c7', parent: '#7c3aed', student: '#dc2626',
};
const ROLE_LABELS = {
  super_admin: 'Super Admin', school_admin: 'School Admin',
  teacher: 'Teacher', parent: 'Parent', student: 'Student',
};

export default function Sidebar({ collapsed, mobileOpen }) {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { user, school } = useSelector(s => s.auth);

  const navSections = NAV[user?.role] || [];
  const initials = user?.name?.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() || 'U';
  const schoolName = school?.name || user?.schoolCode || 'School ERP';

  const profilePath = {
    super_admin:  '/super-admin/profile',
    school_admin: '/admin/profile',
    teacher:      '/teacher/profile',
    parent:       '/parent/profile',
    student:      '/student/profile',
  }[user?.role] || '/profile';

  const handleLogout = async () => {
    await dispatch(logoutUser());
    toast.success('Logged out successfully');
    navigate('/login');
  };

  return (
    <aside className={`sidebar ${collapsed ? 'collapsed' : ''} ${mobileOpen ? 'mobile-open' : ''}`}>
      {/* Logo */}
      <div className="sidebar-logo">
        {school?.logo?.url
          ? <img src={school.logo.url} alt="Logo" className="sidebar-logo-img" />
          : <div className="sidebar-logo-img">{schoolName.charAt(0)}</div>
        }
        {!collapsed && (
          <div className="sidebar-logo-text">
            <div className="sidebar-logo-name">{schoolName}</div>
            <div className="sidebar-logo-sub">{school?.currentAcademicYear || 'School ERP'}</div>
          </div>
        )}
      </div>

      {/* Navigation */}
      <nav className="sidebar-nav">
        {navSections.map((section) => (
          <div key={section.section}>
            {!collapsed && (
              <div className="nav-section-label">{section.section}</div>
            )}
            {section.items.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
                title={collapsed ? item.label : ''}
              >
                <span className="nav-item-icon">{item.icon}</span>
                {!collapsed && <span className="nav-item-text">{item.label}</span>}
              </NavLink>
            ))}
          </div>
        ))}
      </nav>

      {/* Footer / User — click avatar goes to profile, → goes to logout */}
      <div className="sidebar-footer">
        <div className="sidebar-user">
          <div
            onClick={() => navigate(profilePath)}
            title="Profile & Settings"
            style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1, cursor: 'pointer', minWidth: 0 }}
          >
            {user?.avatar?.url
              ? <img src={user.avatar.url} alt="avatar" className="avatar avatar-sm" />
              : (
                <div className="avatar avatar-sm" style={{ background: ROLE_COLORS[user?.role] || '#1e3a5f', color: '#fff', fontSize: '0.7rem' }}>
                  {initials}
                </div>
              )
            }
            {!collapsed && (
              <div className="sidebar-user-info" style={{ minWidth: 0 }}>
                <div className="sidebar-user-name">{user?.name}</div>
                <div className="sidebar-user-role">{ROLE_LABELS[user?.role]}</div>
              </div>
            )}
          </div>
          {!collapsed && (
            <button
              onClick={handleLogout}
              title="Logout"
              style={{
                background: 'none', border: 'none', cursor: 'pointer',
                color: 'rgba(255,255,255,.45)', fontSize: '1rem', padding: '4px 6px',
                borderRadius: 6, flexShrink: 0, transition: 'color 0.2s',
              }}
              onMouseEnter={e => e.currentTarget.style.color = '#fff'}
              onMouseLeave={e => e.currentTarget.style.color = 'rgba(255,255,255,.45)'}
            >
              ⏻
            </button>
          )}
        </div>
      </div>
    </aside>
  );
}
