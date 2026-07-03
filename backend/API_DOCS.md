# Rural School ERP - API Documentation

## Base URL
```
Development: http://localhost:5000/api
Production:  https://api.yourschoolerp.com/api
```

## Authentication
All protected routes require a Bearer token in the Authorization header:
```
Authorization: Bearer <access_token>
```

For tenant-specific routes, also send the school identifier:
```
x-school-id: <school_mongodb_id>
```

---

## AUTH ENDPOINTS

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| POST | /auth/login | Login user | No |
| POST | /auth/refresh | Refresh access token | No |
| POST | /auth/forgot-password | Request password reset | No |
| POST | /auth/reset-password/:token | Reset password | No |
| GET | /auth/me | Get current user profile | Yes |
| POST | /auth/logout | Logout | Yes |
| PUT | /auth/change-password | Change password | Yes |
| PUT | /auth/update-profile | Update profile | Yes |

### Login Request
```json
POST /auth/login
{
  "email": "admin@school.com",
  "password": "Admin@1234"
}
```
### Login Response
```json
{
  "success": true,
  "data": {
    "user": { "id": "...", "name": "...", "role": "school_admin", "schoolId": "..." },
    "accessToken": "eyJ...",
    "refreshToken": "eyJ...",
    "expiresIn": "7d"
  }
}
```

---

## SUPER ADMIN ENDPOINTS
> Role: `super_admin` only

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /super-admin/dashboard | Platform overview stats |
| GET | /super-admin/schools | List all schools |
| POST | /super-admin/schools | Create new school |
| GET | /super-admin/schools/:id | Get school details |
| PATCH | /super-admin/schools/:id/status | Activate/suspend school |
| PUT | /super-admin/schools/:id/subscription | Update subscription plan |
| GET | /super-admin/users | List all users |
| GET | /super-admin/audit-logs | View audit logs |

### Create School Request
```json
POST /super-admin/schools
{
  "name": "Gram Vidyalaya",
  "type": "primary",
  "board": "State Board",
  "email": "school@example.com",
  "phone": "9876543210",
  "address": { "village": "Chandpur", "district": "Ahmednagar", "state": "Maharashtra", "pincode": "423601" },
  "adminName": "Ramesh Patil",
  "adminEmail": "admin@school.com",
  "adminMobile": "9876543210",
  "adminPassword": "Admin@1234"
}
```

---

## SCHOOL ENDPOINTS

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /schools/my-school | Get current school info |
| PUT | /schools/my-school | Update school details |
| POST | /schools/my-school/logo | Upload school logo |

---

## STUDENT ENDPOINTS
> Header: `x-school-id: <schoolId>` required

| Method | Endpoint | Description | Roles |
|--------|----------|-------------|-------|
| GET | /students | List students (paginated) | All |
| POST | /students | Create student | Admin |
| GET | /students/stats | Student statistics | Admin |
| POST | /students/bulk-promote | Bulk promote students | Admin |
| GET | /students/:id | Get student | All |
| PUT | /students/:id | Update student | Admin |
| DELETE | /students/:id | Deactivate student | Admin |
| POST | /students/:id/promote | Promote to next class | Admin |
| POST | /students/:id/transfer | Transfer student | Admin |
| POST | /students/:id/upload-photo | Upload student photo | Admin |
| POST | /students/:id/documents | Upload document | Admin |

### Query Parameters for GET /students
```
page=1&limit=20&search=John&classId=xxx&section=A
academicYear=2024-2025&status=active&gender=male
category=OBC&bloodGroup=O+&sortBy=firstName&sortOrder=asc
```

---

## ATTENDANCE ENDPOINTS

| Method | Endpoint | Description | Roles |
|--------|----------|-------------|-------|
| GET | /attendance | Get attendance records | All |
| POST | /attendance | Mark attendance | Admin, Teacher |
| GET | /attendance/today-summary | Today's summary | Admin |
| GET | /attendance/monthly-report | Monthly class report | Admin, Teacher |
| GET | /attendance/student/:id | Student attendance history | All |
| POST | /attendance/teacher | Mark teacher attendance | Admin |

### Mark Attendance Request
```json
POST /attendance
{
  "classId": "64abc...",
  "section": "A",
  "date": "2024-01-15",
  "academicYear": "2024-2025",
  "records": [
    { "studentId": "64def...", "status": "present" },
    { "studentId": "64ghi...", "status": "absent", "remarks": "Sick" },
    { "studentId": "64jkl...", "status": "leave", "leaveType": "sick" }
  ]
}
```

---

## FEES ENDPOINTS

| Method | Endpoint | Description | Roles |
|--------|----------|-------------|-------|
| GET | /fees/structures | List fee structures | All |
| POST | /fees/structures | Create fee structure | Admin |
| POST | /fees/assign | Assign fees to student | Admin |
| GET | /fees/student/:id | Get student fees | All |
| POST | /fees/:id/collect | Collect payment | Admin |
| GET | /fees/pending | Pending fees list | Admin |
| GET | /fees/receipt/:receiptNo | Download receipt PDF | All |
| GET | /fees/collection-report | Collection report | Admin |

### Collect Payment Request
```json
POST /fees/:feePaymentId/collect
{
  "amount": 5000,
  "paymentMode": "cash",
  "transactionId": "",
  "remarks": "Monthly fee collection"
}
```

---

## EXAM ENDPOINTS

| Method | Endpoint | Description | Roles |
|--------|----------|-------------|-------|
| GET | /exams | List exams | All |
| POST | /exams | Create exam | Admin |
| GET | /exams/:id | Get exam details | All |
| PUT | /exams/:id | Update exam | Admin |
| POST | /exams/:id/marks | Enter student marks | Admin, Teacher |
| GET | /exams/results | Get results | All |
| POST | /exams/:id/publish | Publish results | Admin |
| GET | /exams/:examId/analysis | Class result analysis | Admin |
| GET | /exams/:examId/report-card/:studentId | Download report card PDF | All |

### Enter Marks Request
```json
POST /exams/:examId/marks
{
  "results": [
    {
      "studentId": "64abc...",
      "marks": [
        { "subjectName": "Mathematics", "subjectCode": "MATH", "maxMarks": 100, "passMarks": 35, "marksObtained": 87 },
        { "subjectName": "English", "subjectCode": "ENG", "maxMarks": 100, "passMarks": 35, "marksObtained": 72 }
      ]
    }
  ]
}
```

---

## HOMEWORK ENDPOINTS

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /homework | List homework |
| POST | /homework | Create homework (multipart/form-data) |
| GET | /homework/:id | Get homework details |
| PUT | /homework/:id | Update homework |
| DELETE | /homework/:id | Cancel homework |

---

## NOTICE BOARD ENDPOINTS

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /notice-board | List notices |
| POST | /notice-board | Create notice |
| GET | /notice-board/:id | Get notice |
| PUT | /notice-board/:id | Update notice |
| DELETE | /notice-board/:id | Remove notice |

---

## NOTIFICATION ENDPOINTS

In-app notifications. Each notification can broadcast to one or more roles
(`recipientRoles`) and/or target specific users directly (`recipientIds`).
Read state is tracked per-user, so the same notification is shared by every
recipient until they individually mark it read.

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /notifications | List current user's notifications (paginated, supports `?unreadOnly=true&type=homework`) |
| GET | /notifications/unread-count | Get unread count for the badge |
| PATCH | /notifications/:id/read | Mark one notification as read |
| PATCH | /notifications/mark-all-read | Mark all of the current user's notifications as read |
| POST | /notifications | Compose & send a notification (school_admin, teacher) — target by `recipientRoles` and/or `targetClass` |
| DELETE | /notifications/:id | Deactivate a notification (school_admin) |

Notifications are also created automatically by the system when: a notice is
published, homework is assigned, a leave request is submitted/approved/rejected,
exam results are published, a fee payment is collected, or a student is marked
absent.

### Real-time delivery (Socket.io)

New notifications are pushed instantly over a Socket.io connection in addition
to being available via the REST endpoints above (REST remains the source of
truth and fallback if a socket drops).

**Connecting** — handshake auth, not a header:
```js
import { io } from 'socket.io-client';

const socket = io(SERVER_ORIGIN, {
  auth: {
    token: accessToken,   // same JWT used for REST calls
    schoolId: schoolId,   // same x-school-id value used for REST calls
  }
});
```

**Events received by the client:**

| Event | Payload | Sent when |
|-------|---------|-----------|
| `notification:new` | the full notification document (+`isRead: false`) | a notification is created that targets your role or your user id |
| `notification:read` | `{ id }` | you mark one notification as read from any of your own tabs/devices |
| `notification:all-read` | `{}` | you mark all notifications as read from any of your own tabs/devices |

A user is automatically joined to two rooms on connect: `school:<schoolId>:role:<role>`
(for broadcast notifications) and `user:<userId>` (for directly-targeted ones
and for the read-sync events above). `super_admin` accounts don't use this
layer since notifications are tenant-scoped.

---

## CLASS ENDPOINTS

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /classes | List classes with student counts |
| POST | /classes | Create class |
| GET | /classes/:id | Get class details |
| PUT | /classes/:id | Update class |
| DELETE | /classes/:id | Deactivate class |

---

## LEAVE ENDPOINTS

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /leaves | List leave applications |
| POST | /leaves | Apply for leave |
| PATCH | /leaves/:id/approve | Approve/reject leave |

---

## TIMETABLE ENDPOINTS

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /timetable | Get timetable by class |
| POST | /timetable | Create/update timetable |

---

## ACCOUNTING ENDPOINTS

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /accounting/summary | Financial summary (P&L) |
| GET | /accounting/expenses | List expenses |
| POST | /accounting/expenses | Record expense |

---

## DASHBOARD ENDPOINTS

| Method | Endpoint | Description | Role |
|--------|----------|-------------|------|
| GET | /dashboard/school-admin | Admin dashboard stats | Admin |
| GET | /dashboard/teacher | Teacher dashboard | Teacher |
| GET | /dashboard/student | Student dashboard | Student |

---

## SCHOLARSHIP ENDPOINTS

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /scholarships | List scholarships |
| POST | /scholarships | Create scholarship |
| POST | /scholarships/:id/apply | Apply for scholarship |
| PATCH | /scholarships/:id/applications/:appId | Update application status |

---

## REPORT ENDPOINTS

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /reports/attendance-sheet | Download attendance sheet PDF |

---

## ERROR RESPONSES

All errors follow this format:
```json
{
  "success": false,
  "status": "fail",
  "message": "Error description",
  "errors": [
    { "field": "email", "message": "Valid email is required" }
  ]
}
```

### HTTP Status Codes
- `200` - Success
- `201` - Created
- `400` - Bad Request / Validation Error
- `401` - Unauthorized (invalid/missing token)
- `403` - Forbidden (insufficient permissions)
- `404` - Not Found
- `423` - Account Locked
- `429` - Rate Limit Exceeded
- `500` - Internal Server Error

---

## PAGINATION

All list endpoints support pagination:
```
GET /students?page=1&limit=20&sortBy=firstName&sortOrder=asc
```

Response includes:
```json
{
  "data": {
    "items": [...],
    "pagination": {
      "total": 150,
      "page": 1,
      "limit": 20,
      "pages": 8
    }
  }
}
```

---

## ROLES & PERMISSIONS

| Role | Description |
|------|-------------|
| `super_admin` | Full platform access |
| `school_admin` | Full school access |
| `teacher` | Class/attendance/homework/exam |
| `parent` | View own children's data |
| `student` | View own data |
