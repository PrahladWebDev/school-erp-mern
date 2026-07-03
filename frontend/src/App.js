import React, { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { Toaster } from 'react-hot-toast';
import { fetchMe } from './store/slices/authSlice';
import { applyTheme, loadAppSettings } from './pages/shared/ProfileSettingsPage';

// Public Pages
import LandingPage from './pages/public/LandingPage';

// Auth Pages
import LoginPage from './pages/auth/LoginPage';
import ForgotPasswordPage from './pages/auth/ForgotPasswordPage';

// Layout
import AppLayout from './components/layout/AppLayout';

// Super Admin Pages
import SuperAdminDashboard from './pages/admin/SuperAdminDashboard';
import SchoolsList from './pages/admin/SchoolsList';
import CreateSchool from './pages/admin/CreateSchool';
import EditSchoolPage from './pages/admin/EditSchoolPage';
import ExploreMapPage from './pages/admin/ExploreMapPage';

// School Admin Pages
import SchoolAdminDashboard from './pages/admin/SchoolAdminDashboard';
import StudentsPage from './pages/admin/StudentsPage';
import StudentPromotionPage from './pages/admin/StudentPromotionPage';
import IDCardPage from './pages/admin/IDCardPage';
import StudentDetail from './pages/admin/StudentDetail';
import AddStudentPage from './pages/admin/AddStudentPage';
import TeachersPage from './pages/admin/TeachersPage';
import AddTeacherPage from './pages/admin/AddTeacherPage';
import ClassesPage from './pages/admin/ClassesPage';
import AttendancePage from './pages/admin/AttendancePage';
import AttendanceReportPage from './pages/admin/AttendanceReportPage';
import FeesPage from './pages/admin/FeesPage';
import FeeCollectionPage from './pages/admin/FeeCollectionPage';
import ExamsPage from './pages/admin/ExamsPage';
import ExamMarksPage from './pages/admin/ExamMarksPage';
import ResultsPage from './pages/admin/ResultsPage';
import HomeworkPage from './pages/admin/HomeworkPage';
import NoticeBoardPage from './pages/admin/NoticeBoardPage';
import TimetablePage from './pages/admin/TimetablePage';
import LeavesPage from './pages/admin/LeavesPage';
import AccountingPage from './pages/admin/AccountingPage';
import ScholarshipsPage from './pages/admin/ScholarshipsPage';
import SchoolSettingsPage from './pages/admin/SchoolSettingsPage';

// Teacher Pages
import TeacherDashboard from './pages/teacher/TeacherDashboard';
import TeacherAttendancePage from './pages/teacher/TeacherAttendancePage';
import TeacherHomeworkPage from './pages/teacher/TeacherHomeworkPage';
import TeacherExamPage from './pages/teacher/TeacherExamPage';
import TeacherTimetablePage from './pages/teacher/TeacherTimetablePage';
import TeacherResultsPage from './pages/teacher/TeacherResultsPage';

// Parent Pages
import ParentDashboard from './pages/parent/ParentDashboard';
import ParentAttendancePage from './pages/parent/ParentAttendancePage';
import ParentFeesPage from './pages/parent/ParentFeesPage';
import ParentResultsPage from './pages/parent/ParentResultsPage';
import ParentHomeworkPage from './pages/parent/ParentHomeworkPage';

// Student Pages
import StudentDashboard from './pages/student/StudentDashboard';
import StudentAttendancePage from './pages/student/StudentAttendancePage';
import StudentFeesPage from './pages/student/StudentFeesPage';
import StudentResultsPage from './pages/student/StudentResultsPage';
import StudentTimetablePage from './pages/student/StudentTimetablePage';
import StudentLeavePage from './pages/student/StudentLeavePage';
import StudentHomeworkPage from './pages/student/StudentHomeworkPage';

// Shared
import NoticesPage from './pages/shared/NoticesPage';
import NotificationsPage from './pages/shared/NotificationsPage';
import ProfileSettingsPage from './pages/shared/ProfileSettingsPage';
import NotFoundPage from './pages/shared/NotFoundPage';

// ─── Auth Guard ────────────────────────────────────────────────────────────────
const ProtectedRoute = ({ children, roles }) => {
  const { isAuthenticated, user, initialized } = useSelector(s => s.auth);
  // Wait for fetchMe to resolve before making routing decisions
  if (isAuthenticated && !initialized) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center' }}>
          <div className="spinner" style={{ width: 32, height: 32, borderWidth: 3, margin: '0 auto 12px' }} />
          <p style={{ color: 'var(--gray-500)', fontSize: '0.875rem' }}>Loading...</p>
        </div>
      </div>
    );
  }
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (roles && !roles.includes(user?.role)) return <Navigate to="/login" replace />;
  return children;
};

// ─── Root route: landing page for guests, dashboard redirect for signed-in users ──
const RootRoute = () => {
  const { isAuthenticated, user } = useSelector(s => s.auth);
  if (!isAuthenticated) return <LandingPage />;
  const roleMap = {
    super_admin:  '/super-admin/dashboard',
    school_admin: '/admin/dashboard',
    teacher:      '/teacher/dashboard',
    parent:       '/parent/dashboard',
    student:      '/student/dashboard',
  };
  return <Navigate to={roleMap[user?.role] || '/login'} replace />;
};

export default function App() {
  const dispatch = useDispatch();
  const { isAuthenticated, user } = useSelector(s => s.auth);

  // Apply default theme on startup (before user loads)
  useEffect(() => {
    applyTheme(loadAppSettings());
  }, []);

  // Re-apply user-specific theme once user is known
  useEffect(() => {
    if (user?._id) {
      applyTheme(loadAppSettings(user._id));
    }
  }, [user?._id]);

  useEffect(() => {
    if (isAuthenticated) dispatch(fetchMe());
  }, [dispatch, isAuthenticated]);

  return (
    <BrowserRouter>
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 3500,
          style: { fontFamily: 'Inter, sans-serif', fontSize: '0.875rem' },
          success: { iconTheme: { primary: '#16a34a', secondary: '#fff' } },
          error:   { iconTheme: { primary: '#dc2626', secondary: '#fff' } },
        }}
      />
      <Routes>
        {/* Public */}
        <Route path="/login"           element={<LoginPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />

        {/* Root: landing page for guests, dashboard redirect once signed in */}
        <Route path="/" element={<RootRoute />} />

        {/* ── Super Admin ── */}
        <Route path="/super-admin" element={<ProtectedRoute roles={['super_admin']}><AppLayout /></ProtectedRoute>}>
          <Route path="dashboard"      element={<SuperAdminDashboard />} />
          <Route path="schools"        element={<SchoolsList />} />
          <Route path="schools/create" element={<CreateSchool />} />
          <Route path="schools/:id/edit" element={<EditSchoolPage />} />
          <Route path="explore-map"    element={<ExploreMapPage />} />
          <Route path="profile"        element={<ProfileSettingsPage />} />
        </Route>

        {/* ── School Admin ── */}
        <Route path="/admin" element={<ProtectedRoute roles={['school_admin']}><AppLayout /></ProtectedRoute>}>
          <Route path="dashboard"    element={<SchoolAdminDashboard />} />
          <Route path="students"          element={<StudentsPage />} />
          <Route path="students/add"      element={<AddStudentPage />} />
          <Route path="students/promote"  element={<StudentPromotionPage />} />
          <Route path="students/id-cards" element={<IDCardPage />} />
          <Route path="students/:id"      element={<StudentDetail />} />
          <Route path="teachers"     element={<TeachersPage />} />
          <Route path="teachers/add" element={<AddTeacherPage />} />
          <Route path="classes"      element={<ClassesPage />} />
          <Route path="attendance"   element={<AttendancePage />} />
          <Route path="attendance/report" element={<AttendanceReportPage />} />
          <Route path="fees"         element={<FeesPage />} />
          <Route path="fees/collect/:studentId" element={<FeeCollectionPage />} />
          <Route path="exams"        element={<ExamsPage />} />
          <Route path="exams/:id/marks" element={<ExamMarksPage />} />
          <Route path="results"      element={<ResultsPage />} />
          <Route path="homework"     element={<HomeworkPage />} />
          <Route path="notices"      element={<NoticeBoardPage />} />
          <Route path="timetable"    element={<TimetablePage />} />
          <Route path="leaves"       element={<LeavesPage />} />
          <Route path="accounting"   element={<AccountingPage />} />
          <Route path="scholarships" element={<ScholarshipsPage />} />
          <Route path="notifications" element={<NotificationsPage />} />
          <Route path="settings"     element={<SchoolSettingsPage />} />
          <Route path="profile"      element={<ProfileSettingsPage />} />
        </Route>

        {/* ── Teacher ── */}
        <Route path="/teacher" element={<ProtectedRoute roles={['teacher']}><AppLayout /></ProtectedRoute>}>
          <Route path="dashboard"     element={<TeacherDashboard />} />
          <Route path="attendance"    element={<TeacherAttendancePage />} />
          <Route path="homework"      element={<TeacherHomeworkPage />} />
          <Route path="timetable"     element={<TeacherTimetablePage />} />
          <Route path="exams"         element={<TeacherExamPage />} />
          <Route path="results"       element={<TeacherResultsPage />} />
          <Route path="notices"       element={<NoticesPage />} />
          <Route path="notifications" element={<NotificationsPage />} />
          <Route path="leaves"        element={<LeavesPage />} />
          <Route path="profile"       element={<ProfileSettingsPage />} />
        </Route>

        {/* ── Parent ── */}
        <Route path="/parent" element={<ProtectedRoute roles={['parent']}><AppLayout /></ProtectedRoute>}>
          <Route path="dashboard"     element={<ParentDashboard />} />
          <Route path="attendance"    element={<ParentAttendancePage />} />
          <Route path="fees"          element={<ParentFeesPage />} />
          <Route path="results"       element={<ParentResultsPage />} />
          <Route path="homework"      element={<ParentHomeworkPage />} />
          <Route path="notices"       element={<NoticesPage />} />
          <Route path="notifications" element={<NotificationsPage />} />
          <Route path="profile"       element={<ProfileSettingsPage />} />
        </Route>

        {/* ── Student ── */}
        <Route path="/student" element={<ProtectedRoute roles={['student']}><AppLayout /></ProtectedRoute>}>
          <Route path="dashboard"     element={<StudentDashboard />} />
          <Route path="attendance"    element={<StudentAttendancePage />} />
          <Route path="fees"          element={<StudentFeesPage />} />
          <Route path="results"       element={<StudentResultsPage />} />
          <Route path="timetable"     element={<StudentTimetablePage />} />
          <Route path="homework"      element={<StudentHomeworkPage />} />
          <Route path="leaves"        element={<StudentLeavePage />} />
          <Route path="notices"       element={<NoticesPage />} />
          <Route path="notifications" element={<NotificationsPage />} />
          <Route path="profile"       element={<ProfileSettingsPage />} />
        </Route>

        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </BrowserRouter>
  );
}
