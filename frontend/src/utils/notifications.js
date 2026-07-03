// Shared metadata + role-aware routing for in-app notifications.
// Notification documents store a generic `type`; the actual page that type
// links to differs per role since each role has its own route prefix
// (see App.js). This keeps that mapping in one place.

export const NOTIFICATION_TYPE_META = {
  notice:      { icon: '📢', label: 'Notice',      color: 'info' },
  homework:    { icon: '📝', label: 'Homework',    color: 'primary' },
  leave:       { icon: '🌿', label: 'Leave',       color: 'success' },
  fees:        { icon: '💰', label: 'Fees',        color: 'warning' },
  exam:        { icon: '🏆', label: 'Exam',        color: 'accent' },
  attendance:  { icon: '✅', label: 'Attendance',  color: 'danger' },
  timetable:   { icon: '📅', label: 'Timetable',   color: 'info' },
  scholarship: { icon: '🎓', label: 'Scholarship', color: 'success' },
  general:     { icon: '🔔', label: 'General',     color: 'gray' },
};

const ROUTE_BY_TYPE = {
  notice:      { school_admin: '/notices',     teacher: '/teacher/notices',    parent: '/parent/notices',    student: '/student/notices' },
  homework:    { school_admin: '/homework',    teacher: '/teacher/homework',   parent: '/parent/homework',   student: '/student/homework' },
  leave:       { school_admin: '/leaves',      teacher: '/teacher/leaves',     student: '/student/leaves' },
  fees:        { school_admin: '/fees',        parent: '/parent/fees',         student: '/student/fees' },
  exam:        { school_admin: '/results',     teacher: '/teacher/exams',      parent: '/parent/results',    student: '/student/results' },
  attendance:  { school_admin: '/attendance',  teacher: '/teacher/attendance', parent: '/parent/attendance', student: '/student/attendance' },
  timetable:   { school_admin: '/timetable',   student: '/student/timetable' },
  scholarship: { school_admin: '/scholarships' },
};

const DASHBOARD_BY_ROLE = {
  school_admin: '/dashboard',
  teacher: '/teacher/dashboard',
  parent: '/parent/dashboard',
  student: '/student/dashboard',
};

export function getNotificationLink(type, role) {
  return (ROUTE_BY_TYPE[type] && ROUTE_BY_TYPE[type][role]) || DASHBOARD_BY_ROLE[role] || '/dashboard';
}

export function timeAgo(dateStr) {
  const diffMs = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}
