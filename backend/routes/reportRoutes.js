'use strict';
const express = require('express');
const router = express.Router();
const { protect, restrictTo, schoolBoundary } = require('../middleware/authMiddleware');
const pdfService = require('../services/pdfService');

router.use(protect, restrictTo('super_admin', 'school_admin'), schoolBoundary);

router.get('/attendance-sheet', async (req, res, next) => {
  try {
    const { Attendance, Student, Class } = req.tenantDb;
    const { classId, section, month, academicYear } = req.query;
    if (!classId || !month) return res.status(400).json({ success: false, message: 'classId and month required' });

    const [year, m] = month.split('-');
    const startDate = new Date(year, parseInt(m) - 1, 1);
    const endDate = new Date(year, parseInt(m), 0, 23, 59, 59);

    const filter = { classId, date: { $gte: startDate, $lte: endDate } };
    if (section) filter.section = section.toUpperCase();

    const [attendanceRecords, students, cls] = await Promise.all([
      Attendance.find(filter).sort({ date: 1 }).lean(),
      Student.find({ class: classId, status: 'active' }).select('firstName lastName admissionNumber rollNumber').lean(),
      Class.findById(classId).lean()
    ]);

    const workingDays = attendanceRecords.length;
    const dates = attendanceRecords.map(a => a.date.toISOString().split('T')[0]);

    const studentStats = students.map(s => {
      let present = 0, absent = 0, late = 0, leave = 0;
      attendanceRecords.forEach(a => {
        const r = a.records.find(r => r.studentId.toString() === s._id.toString());
        if (r) {
          if (r.status === 'present') present++;
          else if (r.status === 'absent') absent++;
          else if (r.status === 'late') late++;
          else if (r.status === 'leave') leave++;
        } else absent++;
      });
      return {
        student: s, present, absent, late, leave,
        percentage: workingDays > 0 ? parseFloat(((present + late) / workingDays * 100).toFixed(2)) : 0
      };
    });

    const pdf = await pdfService.generateAttendanceSheet({
      school: req.school,
      className: cls?.name || '',
      section,
      month,
      students: studentStats,
      workingDays,
      dates
    });

    res.set({ 'Content-Type': 'application/pdf', 'Content-Disposition': `inline; filename="attendance-${month}.pdf"` });
    res.send(pdf);
  } catch (err) { next(err); }
});

// ─── Student ID Cards ──────────────────────────────────────────────────────────
router.get('/id-cards', async (req, res, next) => {
  try {
    const { Student, Class } = req.tenantDb;
    const { classId, section, academicYear, studentIds } = req.query;

    let filter = { status: 'active' };

    if (studentIds) {
      // Bulk selected students
      const ids = studentIds.split(',').map(id => id.trim()).filter(Boolean);
      const mongoose = require('mongoose');
      filter._id = { $in: ids.map(id => { try { return new mongoose.Types.ObjectId(id); } catch { return null; } }).filter(Boolean) };
    } else if (classId) {
      filter.class = classId;
      if (section) filter.section = section.toUpperCase();
      if (academicYear) filter.academicYear = academicYear;
    } else {
      return res.status(400).json({ success: false, message: 'Provide classId or studentIds' });
    }

    const students = await Student.find(filter)
      .populate('class', 'name')
      .lean();

    if (!students.length) {
      return res.status(404).json({ success: false, message: 'No students found' });
    }

    // Enrich students with class name and section
    const enriched = students.map(s => ({
      ...s,
      className: s.class?.name || '',
      section: s.section || '',
      academicYear: s.academicYear || req.school?.currentAcademicYear || '',
    }));

    const pdf = await pdfService.generateStudentIDCards({
      school: req.school,
      students: enriched
    });

    const filename = classId
      ? `id-cards-class-${Date.now()}.pdf`
      : `id-cards-selected-${Date.now()}.pdf`;

    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'X-Card-Count': enriched.length
    });
    res.send(pdf);
  } catch (err) { next(err); }
});

module.exports = router;
