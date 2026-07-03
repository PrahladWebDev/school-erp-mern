import axios from 'axios';

const API_BASE = process.env.REACT_APP_API_URL || '/api';

const api = axios.create({
  baseURL: API_BASE,
  timeout: 30000,
  headers: { 'Content-Type': 'application/json' },
});

// ─── Request Interceptor ───────────────────────────────────────────────────────
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('accessToken');
    if (token) config.headers.Authorization = `Bearer ${token}`;

    const schoolId = localStorage.getItem('schoolId');
    if (schoolId) config.headers['x-school-id'] = schoolId;

    return config;
  },
  (error) => Promise.reject(error)
);

// ─── Response Interceptor ──────────────────────────────────────────────────────
let isRefreshing = false;
let failedQueue = [];

const processQueue = (error, token = null) => {
  failedQueue.forEach(prom => {
    if (error) prom.reject(error);
    else prom.resolve(token);
  });
  failedQueue = [];
};

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (error.response?.status === 401 && !originalRequest._retry) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        }).then(token => {
          originalRequest.headers.Authorization = `Bearer ${token}`;
          return api(originalRequest);
        }).catch(err => Promise.reject(err));
      }

      originalRequest._retry = true;
      isRefreshing = true;

      const refreshToken = localStorage.getItem('refreshToken');
      if (!refreshToken) {
        window.location.href = '/login';
        return Promise.reject(error);
      }

      try {
        const { data } = await axios.post(`${API_BASE}/auth/refresh`, { refreshToken });
        const { accessToken } = data.data;
        localStorage.setItem('accessToken', accessToken);
        api.defaults.headers.Authorization = `Bearer ${accessToken}`;
        processQueue(null, accessToken);
        originalRequest.headers.Authorization = `Bearer ${accessToken}`;
        return api(originalRequest);
      } catch (err) {
        processQueue(err, null);
        localStorage.clear();
        window.location.href = '/login';
        return Promise.reject(err);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  }
);

export default api;

// ─── Auth API ──────────────────────────────────────────────────────────────────
export const authAPI = {
  login:           (data) => api.post('/auth/login', data),
  logout:          ()     => api.post('/auth/logout'),
  getMe:           ()     => api.get('/auth/me'),
  changePassword:  (data) => api.put('/auth/change-password', data),
  updateProfile:   (data) => api.put('/auth/update-profile', data),
  forgotPassword:  (data) => api.post('/auth/forgot-password', data),
  resetPassword:   (token, data) => api.post(`/auth/reset-password/${token}`, data),
};

// ─── Super Admin API ───────────────────────────────────────────────────────────
export const superAdminAPI = {
  getDashboard:       ()       => api.get('/super-admin/dashboard'),
  getSchools:         (params) => api.get('/super-admin/schools', { params }),
  createSchool:       (data)   => api.post('/super-admin/schools', data),
  getSchoolById:      (id)     => api.get(`/super-admin/schools/${id}`),
  updateSchool:       (id, data) => api.put(`/super-admin/schools/${id}`, data),
  updateSchoolStatus: (id, data) => api.patch(`/super-admin/schools/${id}/status`, data),
  updateSubscription: (id, data) => api.put(`/super-admin/schools/${id}/subscription`, data),
  getUsers:           (params) => api.get('/super-admin/users', { params }),
  getAuditLogs:       (params) => api.get('/super-admin/audit-logs', { params }),
  syncStats:          ()       => api.post('/super-admin/sync-stats'),
  getCacheStatus:     ()       => api.get('/super-admin/cache-status'),
  clearAllCache:      ()       => api.delete('/super-admin/cache'),
  clearSchoolCache:   (id)     => api.delete(`/super-admin/schools/${id}/cache`),
  migrateDbUris:      ()       => api.post('/super-admin/migrate-db-uris'),
};

// ─── School API ────────────────────────────────────────────────────────────────
export const schoolAPI = {
  getMySchool: ()     => api.get('/schools/my-school'),
  updateSchool:(data) => api.put('/schools/my-school', data),
  uploadLogo:  (formData) => api.post('/schools/my-school/logo', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }),
};

// ─── Student API ───────────────────────────────────────────────────────────────
export const studentAPI = {
  getAll:             (params)      => api.get('/students', { params }),
  getById:            (id)          => api.get(`/students/${id}`),
  create:             (data)        => api.post('/students', data),
  update:             (id, data)    => api.put(`/students/${id}`, data),
  delete:             (id)          => api.delete(`/students/${id}`),
  promote:            (id, data)    => api.post(`/students/${id}/promote`, data),
  bulkPromote:        (data)        => api.post('/students/bulk-promote', data),
  transfer:           (id, data)    => api.post(`/students/${id}/transfer`, data),
  getStats:           (params)      => api.get('/students/stats', { params }),
  resetCredentials:   (id)          => api.post(`/students/${id}/reset-credentials`),
  uploadPhoto:  (id, formData) => api.post(`/students/${id}/upload-photo`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }),
  uploadDoc:    (id, formData) => api.post(`/students/${id}/documents`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }),
};

// ─── Teacher API ───────────────────────────────────────────────────────────────
export const teacherAPI = {
  getAll:             (params)    => api.get('/teachers', { params }),
  getById:            (id)        => api.get(`/teachers/${id}`),
  create:             (data)      => api.post('/teachers', data),
  update:             (id, data)  => api.put(`/teachers/${id}`, data),
  addSalary:          (id, data)  => api.post(`/teachers/${id}/salary`, data),
  getSalaryReport:    (params)    => api.get('/teachers/salary-records', { params }),
  resetCredentials:   (id)        => api.post(`/teachers/${id}/reset-credentials`),
  uploadPhoto:        (id, formData) => api.post(`/teachers/${id}/photo`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }),
};

// ─── Class API ─────────────────────────────────────────────────────────────────
export const classAPI = {
  getAll:   (params)   => api.get('/classes', { params }),
  getById:  (id)       => api.get(`/classes/${id}`),
  create:   (data)     => api.post('/classes', data),
  update:   (id, data) => api.put(`/classes/${id}`, data),
  delete:   (id)       => api.delete(`/classes/${id}`),
};

// ─── Attendance API ────────────────────────────────────────────────────────────
export const attendanceAPI = {
  mark:              (data)   => api.post('/attendance', data),
  get:               (params) => api.get('/attendance', { params }),
  getTodaySummary:   ()       => api.get('/attendance/today-summary'),
  getMonthlyReport:  (params) => api.get('/attendance/monthly-report', { params }),
  getStudentHistory: (id, params) => api.get(`/attendance/student/${id}`, { params }),
  markTeacher:       (data)   => api.post('/attendance/teacher', data),
};

// ─── Fees API ──────────────────────────────────────────────────────────────────
export const feesAPI = {
  getStructures:      (params) => api.get('/fees/structures', { params }),
  createStructure:    (data)   => api.post('/fees/structures', data),
  assignToStudent:    (data)   => api.post('/fees/assign', data),
  collectPayment:     (id, data) => api.post(`/fees/${id}/collect`, data),
  getStudentFees:     (id, params) => api.get(`/fees/student/${id}`, { params }),
  getPendingFees:     (params) => api.get('/fees/pending', { params }),
  getCollectionReport:(params) => api.get('/fees/collection-report', { params }),
  getReceipt:         (receiptNo) => api.get(`/fees/receipt/${receiptNo}`, { responseType: 'blob' }),
};

// ─── Exam API ──────────────────────────────────────────────────────────────────
export const examAPI = {
  getAll:          (params)      => api.get('/exams', { params }),
  getById:         (id)          => api.get(`/exams/${id}`),
  create:          (data)        => api.post('/exams', data),
  update:          (id, data)    => api.put(`/exams/${id}`, data),
  enterMarks:      (id, data)    => api.post(`/exams/${id}/marks`, data),
  getResults:      (params)      => api.get('/exams/results', { params }),
  publish:         (id)          => api.post(`/exams/${id}/publish`),
  getAnalysis:     (id)          => api.get(`/exams/${id}/analysis`),
  getReportCard:   (examId, studentId) =>
    api.get(`/exams/${examId}/report-card/${studentId}`, { responseType: 'blob' }),
};

// ─── Homework API ──────────────────────────────────────────────────────────────
export const homeworkAPI = {
  getAll:   (params)   => api.get('/homework', { params }),
  getById:  (id)       => api.get(`/homework/${id}`),
  create:   (formData) => api.post('/homework', formData, { headers: { 'Content-Type': 'multipart/form-data' } }),
  update:   (id, data) => api.put(`/homework/${id}`, data),
  delete:   (id)       => api.delete(`/homework/${id}`),
};

// ─── Notice Board API ──────────────────────────────────────────────────────────
export const noticeAPI = {
  getAll:   (params)   => api.get('/notice-board', { params }),
  getById:  (id)       => api.get(`/notice-board/${id}`),
  create:   (data)     => api.post('/notice-board', data),
  update:   (id, data) => api.put(`/notice-board/${id}`, data),
  delete:   (id)       => api.delete(`/notice-board/${id}`),
};

// ─── Leave API ─────────────────────────────────────────────────────────────────
export const leaveAPI = {
  getAll:  (params)    => api.get('/leaves', { params }),
  apply:   (data)      => api.post('/leaves', data),
  approve: (id, data)  => api.patch(`/leaves/${id}/approve`, data),
};

// ─── Timetable API ─────────────────────────────────────────────────────────────
export const timetableAPI = {
  getMy:  ()       => api.get('/timetable/my'),          // students only
  get:    (params) => api.get('/timetable', { params }),
  create: (data)   => api.post('/timetable', data),
};

// ─── Accounting API ────────────────────────────────────────────────────────────
export const accountingAPI = {
  getSummary:      (params) => api.get('/accounting/summary', { params }),
  getExpenses:     (params) => api.get('/accounting/expenses', { params }),
  createExpense:   (data)   => api.post('/accounting/expenses', data),
};

// ─── Scholarship API ───────────────────────────────────────────────────────────
export const scholarshipAPI = {
  getAll:           (params)     => api.get('/scholarships', { params }),
  create:           (data)       => api.post('/scholarships', data),
  apply:            (id, data)   => api.post(`/scholarships/${id}/apply`, data),
  updateApplication:(id, appId, data) => api.patch(`/scholarships/${id}/applications/${appId}`, data),
};

// ─── Dashboard API ─────────────────────────────────────────────────────────────
export const dashboardAPI = {
  getSchoolAdmin: () => api.get('/dashboard/school-admin'),
  getTeacher:     () => api.get('/dashboard/teacher'),
  getStudent:     () => api.get('/dashboard/student'),
};

// ─── Notification API ──────────────────────────────────────────────────────────
export const notificationAPI = {
  getAll:          (params) => api.get('/notifications', { params }),
  getUnreadCount:  ()       => api.get('/notifications/unread-count'),
  markRead:        (id)     => api.patch(`/notifications/${id}/read`),
  markAllRead:     ()       => api.patch('/notifications/mark-all-read'),
  create:          (data)   => api.post('/notifications', data),
  delete:          (id)     => api.delete(`/notifications/${id}`),
};

// ─── Report API ────────────────────────────────────────────────────────────────
export const reportAPI = {
  getAttendanceSheet: (params) =>
    api.get('/reports/attendance-sheet', { params, responseType: 'blob' }),
  getIDCards: (params) =>
    api.get('/reports/id-cards', { params, responseType: 'blob' }),
};

// ─── Parent API ────────────────────────────────────────────────────────────────
export const parentAPI = {
  getChildren: () => api.get('/parents/children'),
};
