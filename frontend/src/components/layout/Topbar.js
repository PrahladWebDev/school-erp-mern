import React from 'react';
import { useSelector } from 'react-redux';
import { useLocation } from 'react-router-dom';
import NotificationBell from './NotificationBell';

const BREADCRUMB_MAP = {
  '/dashboard': 'Dashboard', '/students': 'Students', '/students/add': 'Add Student',
  '/teachers': 'Teachers', '/teachers/add': 'Add Teacher', '/classes': 'Classes',
  '/attendance': 'Attendance', '/attendance/report': 'Attendance Report',
  '/fees': 'Fee Management', '/exams': 'Examinations', '/results': 'Results',
  '/homework': 'Homework', '/notices': 'Notice Board', '/timetable': 'Timetable',
  '/leaves': 'Leave Management', '/accounting': 'Accounting', '/scholarships': 'Scholarships',
  '/settings': 'School Settings', '/notifications': 'Notifications',
  '/super-admin/dashboard': 'Dashboard',
  '/super-admin/schools': 'Schools', '/teacher/dashboard': 'Dashboard',
  '/teacher/attendance': 'Attendance', '/teacher/homework': 'Homework',
  '/teacher/notifications': 'Notifications', '/teacher/leaves': 'Leave Requests',
  '/parent/dashboard': 'Dashboard', '/parent/notifications': 'Notifications',
  '/student/dashboard': 'Dashboard', '/student/notifications': 'Notifications',
};

export default function Topbar({ collapsed, onToggleSidebar, onToggleMobile }) {
  const location = useLocation();
  const { user, school } = useSelector(s => s.auth);
  const pageName = BREADCRUMB_MAP[location.pathname] || 'School ERP';

  const ROLE_LABELS = {
    super_admin: 'Super Admin', school_admin: 'Admin',
    teacher: 'Teacher', parent: 'Parent', student: 'Student',
  };
  const ROLE_COLORS = {
    super_admin: '#f5a623', school_admin: '#16a34a',
    teacher: '#0284c7', parent: '#7c3aed', student: '#dc2626',
  };

  return (
    <header className={`topbar ${collapsed ? 'collapsed' : ''}`}>
      <div className="topbar-left">
        {/* Desktop toggle */}
        <button className="topbar-menu-btn btn btn-ghost" onClick={onToggleSidebar}
          style={{ display: 'none', '--display-md': 'flex' }}
          aria-label="Toggle sidebar">
          ☰
        </button>
        {/* Mobile toggle */}
        <button className="topbar-menu-btn btn btn-ghost" onClick={onToggleMobile}
          style={{ display: 'flex' }}
          aria-label="Open menu">
          ☰
        </button>

        <div className="topbar-breadcrumb">
          <span>{school?.name || 'School ERP'}</span>
          <span>/</span>
          <span className="current">{pageName}</span>
        </div>
      </div>

      <div className="topbar-right">
        {/* Notification bell */}
        <NotificationBell />

        {/* User info */}
        <div className="topbar-user">
          <div className="avatar avatar-sm" style={{
            background: ROLE_COLORS[user?.role] || '#1e3a5f', color: '#fff', fontSize: '0.7rem'
          }}>
            {user?.name?.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() || 'U'}
          </div>
          <span className="topbar-user-name" style={{ display: 'none' }}>
            {user?.name}
          </span>
          <span className="topbar-role-badge" style={{
            background: ROLE_COLORS[user?.role] + '20',
            color: ROLE_COLORS[user?.role]
          }}>
            {ROLE_LABELS[user?.role]}
          </span>
        </div>
      </div>
    </header>
  );
}
