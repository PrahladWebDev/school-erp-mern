'use strict';

const AppError = require('../utils/AppError');
const { notify, resolveStudentRecipients } = require('../services/notificationService');

// ─── @POST /api/attendance ────────────────────────────────────────────────────
const markAttendance = async (req, res, next) => {
  try {
    const { Attendance } = req.tenantDb;
    const { classId, section, date, academicYear, records } = req.body;

    const attendanceDate = new Date(date);
    attendanceDate.setHours(0, 0, 0, 0);

    // Upsert: update if exists for that class/section/date
    const attendance = await Attendance.findOneAndUpdate(
      { classId, section: section?.toUpperCase(), date: attendanceDate, academicYear },
      {
        classId,
        section: section?.toUpperCase(),
        date: attendanceDate,
        academicYear,
        records,
        markedBy: req.user.profileId || req.user._id,
        markedByName: req.user.name || req.user.firstName || 'Unknown',
        markedByRole: req.user.role,
        markedAt: new Date()
      },
      { upsert: true, new: true, runValidators: true }
    );

    // Notify guardians of any student marked absent today
    const absentStudentIds = (records || [])
      .filter(r => r.status === 'absent')
      .map(r => r.studentId);

    if (absentStudentIds.length) {
      const recipientIds = await resolveStudentRecipients(req.tenantDb, absentStudentIds, { students: false, guardians: true });
      await notify(req.tenantDb, {
        title: 'Attendance: Absent',
        message: `Your ward was marked absent on ${attendanceDate.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}.`,
        type: 'attendance',
        recipientIds,
        relatedId: attendance._id,
        createdBy: req.user._id,
        createdByName: req.user.name,
        schoolId: req.schoolId
      });
    }

    res.status(201).json({
      success: true,
      message: 'Attendance marked successfully',
      data: { attendance }
    });
  } catch (err) {
    next(err);
  }
};

// ─── @GET /api/attendance ─────────────────────────────────────────────────────
const getAttendance = async (req, res, next) => {
  try {
    const { Attendance } = req.tenantDb;
    const { classId, section, date, academicYear } = req.query;

    const filter = {};
    if (classId) filter.classId = classId;
    if (section) filter.section = section.toUpperCase();
    if (academicYear) filter.academicYear = academicYear;
    if (date) {
      const d = new Date(date);
      d.setHours(0, 0, 0, 0);
      const dEnd = new Date(date);
      dEnd.setHours(23, 59, 59, 999);
      filter.date = { $gte: d, $lte: dEnd };
    }

    const attendance = await Attendance.find(filter)
      .populate('classId', 'name')
      .populate('records.studentId', 'firstName lastName admissionNumber rollNumber photo')
      .lean();

    res.json({ success: true, data: { attendance } });
  } catch (err) {
    next(err);
  }
};

// ─── @GET /api/attendance/student/:studentId ──────────────────────────────────
const getStudentAttendance = async (req, res, next) => {
  try {
    const { Attendance } = req.tenantDb;
    const { studentId } = req.params;
    const { academicYear, month, startDate, endDate } = req.query;

    // Build date filter
    const dateFilter = {};
    if (startDate) dateFilter.$gte = new Date(startDate);
    if (endDate) dateFilter.$lte = new Date(endDate);
    if (month) {
      const [year, m] = month.split('-');
      dateFilter.$gte = new Date(year, parseInt(m) - 1, 1);
      dateFilter.$lte = new Date(year, parseInt(m), 0, 23, 59, 59);
    }

    const matchStage = {
      'records.studentId': require('mongoose').Types.ObjectId.createFromHexString(studentId)
    };
    if (academicYear) matchStage.academicYear = academicYear;
    if (Object.keys(dateFilter).length) matchStage.date = dateFilter;

    const rawData = await Attendance.find(matchStage)
      .sort({ date: -1 })
      .lean();

    // Extract only this student's records
    const attendanceData = rawData.map(a => {
      const record = a.records.find(r => r.studentId.toString() === studentId);
      return {
        date: a.date,
        status: record?.status || 'absent',
        remarks: record?.remarks,
        classId: a.classId
      };
    });

    // Calculate summary
    const summary = {
      total: attendanceData.length,
      present: attendanceData.filter(a => a.status === 'present').length,
      absent: attendanceData.filter(a => a.status === 'absent').length,
      late: attendanceData.filter(a => a.status === 'late').length,
      leave: attendanceData.filter(a => a.status === 'leave').length
    };
    summary.percentage = summary.total > 0
      ? parseFloat(((summary.present + summary.late) / summary.total * 100).toFixed(2))
      : 0;

    res.json({
      success: true,
      data: { attendance: attendanceData, summary }
    });
  } catch (err) {
    next(err);
  }
};

// ─── @GET /api/attendance/monthly-report ─────────────────────────────────────
const getMonthlyReport = async (req, res, next) => {
  try {
    const { Attendance, Student } = req.tenantDb;
    const { classId, section, month, academicYear } = req.query;

    if (!classId || !month) {
      return next(new AppError('classId and month are required', 400));
    }

    const [year, m] = month.split('-');
    const startDate = new Date(year, parseInt(m) - 1, 1);
    const endDate = new Date(year, parseInt(m), 0, 23, 59, 59);

    const filter = {
      classId,
      academicYear,
      date: { $gte: startDate, $lte: endDate }
    };
    if (section) filter.section = section.toUpperCase();

    const [attendanceRecords, students] = await Promise.all([
      Attendance.find(filter).sort({ date: 1 }).lean(),
      Student.find({
        class: classId,
        section: section ? section.toUpperCase() : { $exists: true },
        status: 'active'
      }).select('firstName lastName admissionNumber rollNumber').lean()
    ]);

    const workingDays = attendanceRecords.length;

    // Build matrix: studentId -> { date -> status }
    const matrix = {};
    students.forEach(s => {
      matrix[s._id.toString()] = {
        student: s,
        records: {},
        present: 0, absent: 0, late: 0, leave: 0
      };
    });

    attendanceRecords.forEach(a => {
      const dateStr = a.date.toISOString().split('T')[0];
      a.records.forEach(r => {
        const sid = r.studentId.toString();
        if (matrix[sid]) {
          matrix[sid].records[dateStr] = r.status;
          if (r.status === 'present') matrix[sid].present++;
          else if (r.status === 'absent') matrix[sid].absent++;
          else if (r.status === 'late') matrix[sid].late++;
          else if (r.status === 'leave') matrix[sid].leave++;
        }
      });
    });

    const report = Object.values(matrix).map(m => ({
      ...m,
      percentage: workingDays > 0
        ? parseFloat(((m.present + m.late) / workingDays * 100).toFixed(2))
        : 0
    }));

    // Sort by roll number or name
    report.sort((a, b) => {
      if (a.student.rollNumber && b.student.rollNumber) {
        return parseInt(a.student.rollNumber) - parseInt(b.student.rollNumber);
      }
      return a.student.firstName.localeCompare(b.student.firstName);
    });

    res.json({
      success: true,
      data: {
        report,
        workingDays,
        month,
        dates: attendanceRecords.map(a => a.date.toISOString().split('T')[0])
      }
    });
  } catch (err) {
    next(err);
  }
};

// ─── @GET /api/attendance/today-summary ──────────────────────────────────────
const getTodaySummary = async (req, res, next) => {
  try {
    const { Attendance } = req.tenantDb;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);

    const records = await Attendance.find({
      date: { $gte: today, $lte: todayEnd }
    }).lean();

    let totalPresent = 0, totalAbsent = 0, totalLate = 0, totalLeave = 0;
    records.forEach(r => {
      r.records.forEach(s => {
        if (s.status === 'present') totalPresent++;
        else if (s.status === 'absent') totalAbsent++;
        else if (s.status === 'late') totalLate++;
        else if (s.status === 'leave') totalLeave++;
      });
    });

    const total = totalPresent + totalAbsent + totalLate + totalLeave;

    res.json({
      success: true,
      data: {
        date: today,
        classesMarked: records.length,
        totalPresent, totalAbsent, totalLate, totalLeave,
        total,
        attendancePercentage: total > 0 ? parseFloat(((totalPresent + totalLate) / total * 100).toFixed(2)) : 0
      }
    });
  } catch (err) {
    next(err);
  }
};

// ─── @POST /api/attendance/teacher ───────────────────────────────────────────
const markTeacherAttendance = async (req, res, next) => {
  try {
    const { TeacherAttendance } = req.tenantDb;
    const { teacherId, date, status, checkIn, checkOut, leaveType, remarks } = req.body;

    const attendanceDate = new Date(date);
    attendanceDate.setHours(0, 0, 0, 0);

    const attendance = await TeacherAttendance.findOneAndUpdate(
      { teacherId, date: attendanceDate },
      { teacherId, date: attendanceDate, status, checkIn, checkOut, leaveType, remarks, markedBy: req.user._id },
      { upsert: true, new: true }
    );

    res.json({ success: true, message: 'Teacher attendance marked', data: { attendance } });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  markAttendance, getAttendance, getStudentAttendance,
  getMonthlyReport, getTodaySummary, markTeacherAttendance
};
