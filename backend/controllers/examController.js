'use strict';

const AppError = require('../utils/AppError');
const pdfService = require('../services/pdfService');
const { notify, resolveStudentRecipients } = require('../services/notificationService');

// ─── Helper: compute status from dates ────────────────────────────────────────
function computeStatus(exam) {
  if (exam.status === 'cancelled') return 'cancelled';
  if (exam.isResultPublished) return 'completed';
  const now = new Date();
  const start = exam.startDate ? new Date(exam.startDate) : null;
  const end = exam.endDate ? new Date(exam.endDate) : null;
  if (!start) return exam.status;
  // Normalize to date only
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const s = new Date(start.getFullYear(), start.getMonth(), start.getDate());
  const e = end ? new Date(end.getFullYear(), end.getMonth(), end.getDate()) : s;
  if (today < s) return 'upcoming';
  if (today > e) return 'completed';
  return 'ongoing';
}

const createExam = async (req, res, next) => {
  try {
    const { Exam } = req.tenantDb;
    const exam = await Exam.create({ ...req.body, createdBy: req.user._id });
    res.status(201).json({ success: true, message: 'Exam created', data: { exam } });
  } catch (err) { next(err); }
};

const getAllExams = async (req, res, next) => {
  try {
    const { Exam } = req.tenantDb;
    const { academicYear, classId, examType, status } = req.query;
    const filter = {};
    if (academicYear) filter.academicYear = academicYear;
    if (classId) filter.classId = classId;
    if (examType) filter.examType = examType;
    if (status) filter.status = status;

    const rawExams = await Exam.find(filter)
      .populate('classId', 'name')
      .sort({ startDate: -1 })
      .lean();

    // Auto-update status based on dates
    const exams = await Promise.all(rawExams.map(async (e) => {
      const computedStatus = computeStatus(e);
      if (computedStatus !== e.status && e.status !== 'cancelled') {
        await Exam.findByIdAndUpdate(e._id, { status: computedStatus });
        return { ...e, status: computedStatus };
      }
      return e;
    }));

    res.json({ success: true, data: { exams } });
  } catch (err) { next(err); }
};

const getExamById = async (req, res, next) => {
  try {
    const { Exam } = req.tenantDb;
    const exam = await Exam.findById(req.params.id).populate('classId', 'name sections');
    if (!exam) return next(new AppError('Exam not found', 404));
    // Recompute status
    const computedStatus = computeStatus(exam.toObject());
    if (computedStatus !== exam.status && exam.status !== 'cancelled') {
      exam.status = computedStatus;
      await exam.save();
    }
    res.json({ success: true, data: { exam } });
  } catch (err) { next(err); }
};

const updateExam = async (req, res, next) => {
  try {
    const { Exam } = req.tenantDb;
    const exam = await Exam.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (!exam) return next(new AppError('Exam not found', 404));
    res.json({ success: true, message: 'Exam updated', data: { exam } });
  } catch (err) { next(err); }
};

// ─── Enter Marks ───────────────────────────────────────────────────────────────
// Accepts both formats:
//   { results: [{ studentId, marks: [{subjectName,marksObtained,maxMarks,passMarks}] }] }
//   { marks:   [{ studentId, subjectMarks: [...] }] }  (sent by admin/teacher UI)
const enterMarks = async (req, res, next) => {
  try {
    const { Result, Exam, Student } = req.tenantDb;
    const { examId } = req.params;

    // Normalise payload
    let resultsArr = req.body.results;
    if (!resultsArr && req.body.marks) {
      // Admin/teacher UI format: { marks: [{ studentId, subjectMarks }] }
      resultsArr = req.body.marks.map(m => ({
        studentId: m.studentId,
        marks: (m.subjectMarks || []).map(s => ({
          subjectName: s.subjectName,
          marksObtained: s.marksObtained,
          maxMarks: s.maxMarks,
          passMarks: s.passMarks
        }))
      }));
    }

    if (!resultsArr || !Array.isArray(resultsArr)) {
      return next(new AppError('No results data provided', 400));
    }

    const exam = await Exam.findById(examId);
    if (!exam) return next(new AppError('Exam not found', 404));

    const savedResults = await Promise.all(
      resultsArr.map(async (r) => {
        const student = await Student.findById(r.studentId)
          .populate('class', 'name')
          .lean();
        if (!student) return null;

        // Calculate grade per subject
        const marksWithGrade = r.marks.map(m => {
          const pct = m.maxMarks > 0 ? (m.marksObtained / m.maxMarks) * 100 : 0;
          const gradeEntry = exam.gradingSystem
            .sort((a, b) => b.minPercentage - a.minPercentage)
            .find(g => pct >= g.minPercentage);
          return { ...m, grade: gradeEntry?.grade || 'F' };
        });

        return Result.findOneAndUpdate(
          { examId, studentId: r.studentId },
          {
            examId,
            examName: exam.name,
            examType: exam.examType,
            studentId: r.studentId,
            studentName: `${student.firstName} ${student.lastName || ''}`.trim(),
            admissionNumber: student.admissionNumber,
            classId: student.class._id,
            className: student.class.name,
            section: student.section,
            academicYear: exam.academicYear,
            rollNumber: student.rollNumber,
            marks: marksWithGrade,
            enteredBy: req.user._id,
            enteredByName: req.user.name || req.user.firstName || 'Unknown',
            enteredByRole: req.user.role,
            enteredAt: new Date()
          },
          { upsert: true, new: true, runValidators: true }
        );
      })
    );

    // Calculate ranks
    const classResults = await Result.find({ examId }).sort({ obtainedPercentage: -1 });
    await Promise.all(
      classResults.map((r, idx) =>
        Result.findByIdAndUpdate(r._id, { rank: idx + 1 })
      )
    );

    // Assign overall grade
    for (const result of savedResults.filter(Boolean)) {
      const gradeEntry = exam.gradingSystem
        .sort((a, b) => b.minPercentage - a.minPercentage)
        .find(g => result.obtainedPercentage >= g.minPercentage);
      await Result.findByIdAndUpdate(result._id, { grade: gradeEntry?.grade || 'F' });
    }

    // Mark exam as completed if was upcoming/ongoing
    if (exam.status === 'upcoming' || exam.status === 'ongoing') {
      await Exam.findByIdAndUpdate(examId, { status: 'completed' });
    }

    res.json({
      success: true,
      message: `Marks entered for ${savedResults.filter(Boolean).length} students by ${req.user.role}`,
      data: { count: savedResults.filter(Boolean).length, enteredBy: req.user.name || req.user.role }
    });
  } catch (err) { next(err); }
};

// ─── Get Results ───────────────────────────────────────────────────────────────
const getResults = async (req, res, next) => {
  try {
    const { Result } = req.tenantDb;
    const { examId, classId, studentId, academicYear } = req.query;
    const filter = {};
    if (examId) filter.examId = examId;
    if (classId) filter.classId = classId;
    if (studentId) filter.studentId = studentId;
    if (academicYear) filter.academicYear = academicYear;

    const results = await Result.find(filter)
      .populate('examId', 'name examType gradingSystem')
      .sort({ rank: 1, obtainedPercentage: -1 })
      .lean();

    res.json({ success: true, data: { results, total: results.length } });
  } catch (err) { next(err); }
};

// ─── Publish Results ───────────────────────────────────────────────────────────
const publishResults = async (req, res, next) => {
  try {
    const { Result, Exam } = req.tenantDb;
    const { examId } = req.params;

    const [exam] = await Promise.all([
      Exam.findById(examId).select('name').lean(),
      Result.updateMany({ examId }, { isPublished: true }),
      Exam.findByIdAndUpdate(examId, {
        isResultPublished: true,
        publishedAt: new Date(),
        status: 'completed'
      })
    ]);

    const results = await Result.find({ examId }).select('studentId').lean();
    const recipientIds = await resolveStudentRecipients(
      req.tenantDb,
      results.map(r => r.studentId),
      { students: true, guardians: true }
    );

    await notify(req.tenantDb, {
      title: 'Exam Results Published',
      message: `Results for ${exam?.name || 'the exam'} have been published. Check your report card.`,
      type: 'exam',
      recipientIds,
      relatedId: examId,
      createdBy: req.user._id,
      createdByName: req.user.name,
      schoolId: req.schoolId
    });

    res.json({ success: true, message: 'Results published successfully' });
  } catch (err) { next(err); }
};

// ─── Report Card PDF ───────────────────────────────────────────────────────────
const generateReportCard = async (req, res, next) => {
  try {
    const { Result, Exam } = req.tenantDb;
    const { examId, studentId } = req.params;

    const [result, exam] = await Promise.all([
      Result.findOne({ examId, studentId })
        .populate('examId', 'name examType gradingSystem')
        .lean(),
      Exam.findById(examId).lean()
    ]);

    if (!result) return next(new AppError('Result not found for this student', 404));
    if (!exam) return next(new AppError('Exam not found', 404));

    const reportCardData = {
      school: req.school,
      result,
      exam,
      gradingSystem: exam.gradingSystem || []
    };

    const pdfBuffer = await pdfService.generateReportCard(reportCardData);

    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `inline; filename="report-card-${studentId}.pdf"`,
      'Content-Length': pdfBuffer.length
    });

    res.send(pdfBuffer);
  } catch (err) { next(err); }
};

// ─── Class Result Analysis ─────────────────────────────────────────────────────
const getClassResultAnalysis = async (req, res, next) => {
  try {
    const { Result } = req.tenantDb;
    const { examId } = req.params;

    const results = await Result.find({ examId }).lean();
    if (!results.length) return next(new AppError('No results found for this exam', 404));

    const total = results.length;
    const passed = results.filter(r => r.result === 'pass').length;
    const failed = results.filter(r => r.result === 'fail').length;
    const absent = results.filter(r => r.result === 'absent').length;

    const avgPercentage = results.reduce((s, r) => s + (r.obtainedPercentage || 0), 0) / total;
    const highest = Math.max(...results.map(r => r.obtainedPercentage || 0));
    const lowest = Math.min(...results.map(r => r.obtainedPercentage || 0));

    const gradeDistribution = results.reduce((acc, r) => {
      if (r.grade) acc[r.grade] = (acc[r.grade] || 0) + 1;
      return acc;
    }, {});

    // Subject-wise analysis
    const subjectMap = {};
    results.forEach(r => {
      (r.marks || []).forEach(m => {
        if (!subjectMap[m.subjectName]) {
          subjectMap[m.subjectName] = { total: 0, sum: 0, pass: 0, fail: 0, maxMarks: m.maxMarks };
        }
        if (!m.isAbsent && m.marksObtained !== null) {
          subjectMap[m.subjectName].total++;
          subjectMap[m.subjectName].sum += m.marksObtained;
          if (m.marksObtained >= m.passMarks) subjectMap[m.subjectName].pass++;
          else subjectMap[m.subjectName].fail++;
        }
      });
    });

    const subjectAnalysis = Object.entries(subjectMap).map(([name, data]) => ({
      subjectName: name,
      avgMarks: data.total > 0 ? parseFloat((data.sum / data.total).toFixed(2)) : 0,
      passCount: data.pass,
      failCount: data.fail,
      passPercentage: data.total > 0 ? parseFloat((data.pass / data.total * 100).toFixed(2)) : 0
    }));

    res.json({
      success: true,
      data: {
        total, passed, failed, absent,
        passPercentage: parseFloat((passed / total * 100).toFixed(2)),
        avgPercentage: parseFloat(avgPercentage.toFixed(2)),
        highest, lowest,
        gradeDistribution,
        subjectAnalysis,
        toppers: results.slice(0, 5).map(r => ({
          studentName: r.studentName,
          rollNumber: r.rollNumber,
          percentage: r.obtainedPercentage,
          rank: r.rank,
          grade: r.grade
        }))
      }
    });
  } catch (err) { next(err); }
};

module.exports = {
  createExam, getAllExams, getExamById, updateExam,
  enterMarks, getResults, publishResults,
  generateReportCard, getClassResultAnalysis
};
