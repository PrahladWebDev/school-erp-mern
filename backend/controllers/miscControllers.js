'use strict';

const AppError = require('../utils/AppError');
const { notify, resolveClassRecipients } = require('../services/notificationService');

// ══════════════════════════════════════════════════════════════════════════════
// HOMEWORK CONTROLLER
// ══════════════════════════════════════════════════════════════════════════════

const homeworkController = {
  create: async (req, res, next) => {
    try {
      const { Homework } = req.tenantDb;
      const homework = await Homework.create({
        ...req.body,
        assignedBy: req.user.profileId || req.user._id,
        teacherName: req.user.name,
        attachments: req.files?.map(f => ({ name: f.originalname, url: f.path, publicId: f.filename, fileType: f.mimetype })) || []
      });

      const recipientIds = await resolveClassRecipients(req.tenantDb, homework.classId, { students: true, guardians: true });
      await notify(req.tenantDb, {
        title: `New Homework: ${homework.subject}`,
        message: `${homework.title} — due ${new Date(homework.dueDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}`,
        type: 'homework',
        recipientIds,
        relatedId: homework._id,
        createdBy: req.user._id,
        createdByName: req.user.name,
        schoolId: req.schoolId
      });

      res.status(201).json({ success: true, message: 'Homework assigned', data: { homework } });
    } catch (err) { next(err); }
  },

  getAll: async (req, res, next) => {
    try {
      const { Homework, Student } = req.tenantDb;
      const { classId, section, subject, academicYear, page = 1, limit = 20 } = req.query;
      const filter = {};
      const role = req.user.role;

      if (role === 'student') {
        // Students only see active homework for their own class
        const student = await Student.findById(req.user.profileId).lean();
        if (student?.class) filter.classId = student.class;
        filter.status = 'active';
        filter.dueDate = { $gte: new Date() };
      } else if (role === 'parent') {
        // Parents see active homework; frontend may pass classId
        filter.status = 'active';
        filter.dueDate = { $gte: new Date() };
        if (classId) filter.classId = classId;
      } else {
        // Teachers & Admins see all homework with optional filters
        if (classId) filter.classId = classId;
        if (section) filter.section = section.toUpperCase();
        if (subject) filter.subject = subject;
        if (academicYear) filter.academicYear = academicYear;
      }

      const skip = (parseInt(page) - 1) * parseInt(limit);
      const [homeworks, total] = await Promise.all([
        Homework.find(filter)
          .populate('classId', 'name')
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(parseInt(limit))
          .lean(),
        Homework.countDocuments(filter)
      ]);

      res.json({ success: true, data: { homeworks, pagination: { total, page: parseInt(page), limit: parseInt(limit), pages: Math.ceil(total / parseInt(limit)) } } });
    } catch (err) { next(err); }
  },

  getById: async (req, res, next) => {
    try {
      const { Homework } = req.tenantDb;
      const hw = await Homework.findById(req.params.id).populate('classId', 'name').populate('assignedBy', 'firstName lastName');
      if (!hw) return next(new AppError('Homework not found', 404));
      res.json({ success: true, data: { homework: hw } });
    } catch (err) { next(err); }
  },

  update: async (req, res, next) => {
    try {
      const { Homework } = req.tenantDb;
      const hw = await Homework.findByIdAndUpdate(req.params.id, req.body, { new: true });
      if (!hw) return next(new AppError('Homework not found', 404));
      res.json({ success: true, message: 'Homework updated', data: { homework: hw } });
    } catch (err) { next(err); }
  },

  delete: async (req, res, next) => {
    try {
      const { Homework } = req.tenantDb;
      const hw = await Homework.findByIdAndUpdate(req.params.id, { status: 'cancelled' }, { new: true });
      if (!hw) return next(new AppError('Homework not found', 404));
      res.json({ success: true, message: 'Homework cancelled' });
    } catch (err) { next(err); }
  }
};

// ══════════════════════════════════════════════════════════════════════════════
// NOTICE BOARD CONTROLLER
// ══════════════════════════════════════════════════════════════════════════════

const noticeBoardController = {
  create: async (req, res, next) => {
    try {
      const { NoticeBoard } = req.tenantDb;
      const notice = await NoticeBoard.create({
        ...req.body,
        createdBy: req.user._id,
        createdByName: req.user.name
      });

      // Map notice "audience" tags onto actual user roles
      const AUDIENCE_ROLE_MAP = {
        all: ['school_admin', 'teacher', 'parent', 'student'],
        students: ['student'],
        teachers: ['teacher'],
        parents: ['parent'],
        staff: ['teacher', 'school_admin']
      };
      const roles = new Set();
      (notice.targetAudience || ['all']).forEach(a => (AUDIENCE_ROLE_MAP[a] || []).forEach(r => roles.add(r)));

      let recipientIds = [];
      // If the notice is scoped to specific classes (not all classes), narrow the
      // student/parent targeting down to just those classes' students & guardians.
      if (!notice.isAllClasses && notice.targetClasses && notice.targetClasses.length) {
        const wantsStudents = roles.has('student');
        const wantsParents = roles.has('parent');
        if (wantsStudents || wantsParents) {
          for (const classId of notice.targetClasses) {
            const ids = await resolveClassRecipients(req.tenantDb, classId, { students: wantsStudents, guardians: wantsParents });
            recipientIds.push(...ids);
          }
          roles.delete('student');
          roles.delete('parent');
        }
      }

      await notify(req.tenantDb, {
        title: `New Notice: ${notice.title}`,
        message: notice.content.length > 140 ? `${notice.content.slice(0, 140)}…` : notice.content,
        type: 'notice',
        priority: notice.category === 'urgent' ? 'high' : 'normal',
        recipientRoles: [...roles],
        recipientIds,
        relatedId: notice._id,
        createdBy: req.user._id,
        createdByName: req.user.name,
        schoolId: req.schoolId
      });

      res.status(201).json({ success: true, message: 'Notice published', data: { notice } });
    } catch (err) { next(err); }
  },

  getAll: async (req, res, next) => {
    try {
      const { NoticeBoard } = req.tenantDb;
      const { category, audience, page = 1, limit = 20, search } = req.query;

      const filter = {
        isActive: true,
        $or: [{ expiryDate: null }, { expiryDate: { $gte: new Date() } }]
      };
      if (category) filter.category = category;
      if (audience) filter.targetAudience = audience;
      if (search) filter.$and = [{ title: { $regex: search, $options: 'i' } }];

      // Role-based filter
      const roleAudienceMap = { teacher: 'teachers', parent: 'parents', student: 'students' };
      if (roleAudienceMap[req.user.role]) {
        filter.targetAudience = { $in: [roleAudienceMap[req.user.role], 'all'] };
      }

      const skip = (parseInt(page) - 1) * parseInt(limit);
      const [notices, total] = await Promise.all([
        NoticeBoard.find(filter).sort({ isPinned: -1, publishDate: -1 }).skip(skip).limit(parseInt(limit)).lean(),
        NoticeBoard.countDocuments(filter)
      ]);
      res.json({ success: true, data: { notices, pagination: { total, page: parseInt(page), limit: parseInt(limit), pages: Math.ceil(total / parseInt(limit)) } } });
    } catch (err) { next(err); }
  },

  getById: async (req, res, next) => {
    try {
      const { NoticeBoard } = req.tenantDb;
      const notice = await NoticeBoard.findById(req.params.id).lean();
      if (!notice) return next(new AppError('Notice not found', 404));
      res.json({ success: true, data: { notice } });
    } catch (err) { next(err); }
  },

  update: async (req, res, next) => {
    try {
      const { NoticeBoard } = req.tenantDb;
      const notice = await NoticeBoard.findByIdAndUpdate(req.params.id, req.body, { new: true });
      if (!notice) return next(new AppError('Notice not found', 404));
      res.json({ success: true, message: 'Notice updated', data: { notice } });
    } catch (err) { next(err); }
  },

  delete: async (req, res, next) => {
    try {
      const { NoticeBoard } = req.tenantDb;
      await NoticeBoard.findByIdAndUpdate(req.params.id, { isActive: false });
      res.json({ success: true, message: 'Notice removed' });
    } catch (err) { next(err); }
  }
};

// ══════════════════════════════════════════════════════════════════════════════
// LEAVE CONTROLLER
// ══════════════════════════════════════════════════════════════════════════════

const leaveController = {
  apply: async (req, res, next) => {
    try {
      const { Leave } = req.tenantDb;
      const leave = await Leave.create({
        ...req.body,
        applicantId: req.body.applicantId || req.user.profileId,
        applicantName: req.body.applicantName || req.user.name
      });

      await notify(req.tenantDb, {
        title: 'New Leave Request',
        message: `${leave.applicantName} applied for ${leave.leaveType} leave (${leave.totalDays} day${leave.totalDays > 1 ? 's' : ''})`,
        type: 'leave',
        recipientRoles: ['school_admin'],
        relatedId: leave._id,
        createdBy: req.user._id,
        createdByName: req.user.name,
        schoolId: req.schoolId
      });

      res.status(201).json({ success: true, message: 'Leave application submitted', data: { leave } });
    } catch (err) { next(err); }
  },

  getAll: async (req, res, next) => {
    try {
      const { Leave } = req.tenantDb;
      const { applicantType, status, page = 1, limit = 20, applicantId } = req.query;
      const filter = {};
      if (applicantType) filter.applicantType = applicantType;
      if (status) filter.status = status;
      if (applicantId) filter.applicantId = applicantId;

      // Students/parents see only their own
      if (['student', 'parent'].includes(req.user.role)) {
        filter.applicantId = req.user.profileId;
      }

      const skip = (parseInt(page) - 1) * parseInt(limit);
      const [leaves, total] = await Promise.all([
        Leave.find(filter).sort({ createdAt: -1 }).skip(skip).limit(parseInt(limit)).lean(),
        Leave.countDocuments(filter)
      ]);
      res.json({ success: true, data: { leaves, pagination: { total, page: parseInt(page), limit: parseInt(limit), pages: Math.ceil(total / parseInt(limit)) } } });
    } catch (err) { next(err); }
  },

  approve: async (req, res, next) => {
    try {
      const { Leave, Student, Teacher } = req.tenantDb;
      const { status, rejectionReason } = req.body;
      if (!['approved', 'rejected'].includes(status)) return next(new AppError('Invalid status', 400));

      const leave = await Leave.findByIdAndUpdate(req.params.id, {
        status, rejectionReason,
        approvedBy: req.user._id,
        approvedByName: req.user.name || req.user.firstName || req.user.role,
        approvedByRole: req.user.role,
        approvedAt: new Date()
      }, { new: true });

      if (!leave) return next(new AppError('Leave application not found', 404));

      // Notify the applicant (and, for students, their guardians too)
      let recipientIds = [];
      if (leave.applicantType === 'student') {
        const student = await Student.findById(leave.applicantId).select('userId guardians').lean();
        if (student) {
          if (student.userId) recipientIds.push(student.userId);
          (student.guardians || []).forEach(g => g.userId && recipientIds.push(g.userId));
        }
      } else if (leave.applicantType === 'teacher') {
        const teacher = await Teacher.findById(leave.applicantId).select('userId').lean();
        if (teacher?.userId) recipientIds.push(teacher.userId);
      }

      await notify(req.tenantDb, {
        title: `Leave ${status === 'approved' ? 'Approved' : 'Rejected'}`,
        message: status === 'approved'
          ? `Your ${leave.leaveType} leave request (${new Date(leave.fromDate).toLocaleDateString('en-IN')} – ${new Date(leave.toDate).toLocaleDateString('en-IN')}) was approved.`
          : `Your ${leave.leaveType} leave request was rejected.${rejectionReason ? ` Reason: ${rejectionReason}` : ''}`,
        type: 'leave',
        priority: status === 'rejected' ? 'high' : 'normal',
        recipientIds,
        relatedId: leave._id,
        createdBy: req.user._id,
        createdByName: req.user.name,
        schoolId: req.schoolId
      });

      res.json({ success: true, message: `Leave ${status}`, data: { leave } });
    } catch (err) { next(err); }
  }
};

// ══════════════════════════════════════════════════════════════════════════════
// CLASS CONTROLLER
// ══════════════════════════════════════════════════════════════════════════════

const classController = {
  create: async (req, res, next) => {
    try {
      const { Class } = req.tenantDb;
      const cls = await Class.create(req.body);
      res.status(201).json({ success: true, message: 'Class created', data: { class: cls } });
    } catch (err) { next(err); }
  },

  getAll: async (req, res, next) => {
    try {
      const { Class, Student } = req.tenantDb;
      const { academicYear, isActive } = req.query;
      const filter = {};
      if (academicYear) filter.academicYear = academicYear;
      if (isActive !== undefined) filter.isActive = isActive === 'true';

      const classes = await Class.find(filter)
        .populate('classTeacher', 'firstName lastName')
        .sort({ order: 1, numericName: 1 })
        .lean();

      // Add student count
      const classesWithCount = await Promise.all(
        classes.map(async (c) => {
          const studentCount = await Student.countDocuments({ class: c._id, status: 'active' });
          return { ...c, studentCount };
        })
      );

      res.json({ success: true, data: { classes: classesWithCount } });
    } catch (err) { next(err); }
  },

  getById: async (req, res, next) => {
    try {
      const { Class } = req.tenantDb;
      const cls = await Class.findById(req.params.id)
        .populate('classTeacher', 'firstName lastName mobile photo')
        .lean();
      if (!cls) return next(new AppError('Class not found', 404));
      res.json({ success: true, data: { class: cls } });
    } catch (err) { next(err); }
  },

  update: async (req, res, next) => {
    try {
      const { Class } = req.tenantDb;
      const cls = await Class.findByIdAndUpdate(req.params.id, req.body, { new: true });
      if (!cls) return next(new AppError('Class not found', 404));
      res.json({ success: true, message: 'Class updated', data: { class: cls } });
    } catch (err) { next(err); }
  },

  delete: async (req, res, next) => {
    try {
      const { Class } = req.tenantDb;
      await Class.findByIdAndUpdate(req.params.id, { isActive: false });
      res.json({ success: true, message: 'Class deactivated' });
    } catch (err) { next(err); }
  }
};

// ══════════════════════════════════════════════════════════════════════════════
// TIMETABLE CONTROLLER
// ══════════════════════════════════════════════════════════════════════════════

const timetableController = {
  // GET /api/timetable/my — students fetch their own class timetable without
  // the frontend needing to know classId ahead of time.
  getMyTimetable: async (req, res, next) => {
    try {
      const { Timetable, Student, Teacher } = req.tenantDb;

      let classId = null;
      let section = null;

      if (req.user.role === 'student' && req.user.profileId) {
        const student = await Student.findById(req.user.profileId).select('class section').lean();
        classId = student?.class;
        section = student?.section;
      } else {
        return next(new AppError('Route only available for students', 403));
      }

      if (!classId) {
        return res.json({ success: true, data: { timetable: null } });
      }

      const filter = { classId };
      if (section) filter.section = section.toUpperCase();
      // Try with section first; fall back to no section if nothing found
      let timetable = await Timetable.findOne(filter).lean();
      if (!timetable && section) {
        timetable = await Timetable.findOne({ classId }).lean();
      }

      // Resolve teacher names
      if (timetable?.schedule) {
        const teacherIds = new Set();
        timetable.schedule.forEach(day =>
          (day.periods || []).forEach(p => { if (p.teacherId) teacherIds.add(p.teacherId.toString()); })
        );
        if (teacherIds.size > 0) {
          const teachers = await Teacher.find({ _id: { $in: [...teacherIds] } })
            .select('firstName lastName').lean();
          const teacherMap = {};
          teachers.forEach(t => { teacherMap[t._id.toString()] = `${t.firstName} ${t.lastName || ''}`.trim(); });
          timetable.schedule.forEach(day =>
            (day.periods || []).forEach(p => {
              if (p.teacherId && teacherMap[p.teacherId.toString()]) {
                p.teacherName = p.teacherName || teacherMap[p.teacherId.toString()];
              }
            })
          );
        }
      }

      res.json({ success: true, data: { timetable } });
    } catch (err) { next(err); }
  },

  create: async (req, res, next) => {
    try {
      const { Timetable } = req.tenantDb;
      const tt = await Timetable.findOneAndUpdate(
        { classId: req.body.classId, section: req.body.section, academicYear: req.body.academicYear },
        { ...req.body, createdBy: req.user._id },
        { upsert: true, new: true }
      );
      res.status(201).json({ success: true, message: 'Timetable saved', data: { timetable: tt } });
    } catch (err) { next(err); }
  },

  getByClass: async (req, res, next) => {
    try {
      const { Timetable, Teacher } = req.tenantDb;
      const { classId, section, academicYear } = req.query;
      const filter = {};
      if (classId) filter.classId = classId;
      if (section) filter.section = section.toUpperCase();
      if (academicYear) filter.academicYear = academicYear;

      const timetable = await Timetable.findOne(filter).lean();

      // Manually resolve teacher names from teacherId refs (nested populate is
      // unreliable on deeply-nested subdocument arrays in older Mongoose builds)
      if (timetable?.schedule) {
        const teacherIds = new Set();
        timetable.schedule.forEach(day =>
          (day.periods || []).forEach(p => { if (p.teacherId) teacherIds.add(p.teacherId.toString()); })
        );
        if (teacherIds.size > 0) {
          const teachers = await Teacher.find({ _id: { $in: [...teacherIds] } })
            .select('firstName lastName').lean();
          const teacherMap = {};
          teachers.forEach(t => { teacherMap[t._id.toString()] = `${t.firstName} ${t.lastName || ''}`.trim(); });
          timetable.schedule.forEach(day =>
            (day.periods || []).forEach(p => {
              if (p.teacherId && teacherMap[p.teacherId.toString()]) {
                p.teacherName = p.teacherName || teacherMap[p.teacherId.toString()];
                p.teacherId = { _id: p.teacherId, firstName: teachers.find(t => t._id.toString() === p.teacherId.toString())?.firstName, lastName: teachers.find(t => t._id.toString() === p.teacherId.toString())?.lastName };
              }
            })
          );
        }
      }

      res.json({ success: true, data: { timetable } });
    } catch (err) { next(err); }
  }
};

// ══════════════════════════════════════════════════════════════════════════════
// ACCOUNTING CONTROLLER
// ══════════════════════════════════════════════════════════════════════════════

const accountingController = {
  createExpense: async (req, res, next) => {
    try {
      const { Expense } = req.tenantDb;
      const month = new Date(req.body.date || Date.now()).toISOString().slice(0, 7);
      const expense = await Expense.create({ ...req.body, month, createdBy: req.user._id });
      res.status(201).json({ success: true, message: 'Expense recorded', data: { expense } });
    } catch (err) { next(err); }
  },

  getAllExpenses: async (req, res, next) => {
    try {
      const { Expense } = req.tenantDb;
      const { month, category, academicYear, page = 1, limit = 20 } = req.query;
      const filter = {};
      if (month) filter.month = month;
      if (category) filter.category = category;
      if (academicYear) filter.academicYear = academicYear;

      const skip = (parseInt(page) - 1) * parseInt(limit);
      const [expenses, total] = await Promise.all([
        Expense.find(filter).sort({ date: -1 }).skip(skip).limit(parseInt(limit)).lean(),
        Expense.countDocuments(filter)
      ]);

      const totalAmount = expenses.reduce((s, e) => s + e.amount, 0);
      res.json({ success: true, data: { expenses, totalAmount, pagination: { total, page: parseInt(page), limit: parseInt(limit), pages: Math.ceil(total / parseInt(limit)) } } });
    } catch (err) { next(err); }
  },

  getFinancialSummary: async (req, res, next) => {
    try {
      const { Expense, FeePayment } = req.tenantDb;
      const { academicYear, month } = req.query;

      const expFilter = {};
      const feeFilter = {};
      if (academicYear) { expFilter.academicYear = academicYear; feeFilter.academicYear = academicYear; }
      if (month) expFilter.month = month;

      const [expenseAgg, feeAgg, expenseByCategory] = await Promise.all([
        Expense.aggregate([{ $match: expFilter }, { $group: { _id: '$month', totalExpense: { $sum: '$amount' } } }, { $sort: { _id: 1 } }]),
        FeePayment.aggregate([{ $match: feeFilter }, { $group: { _id: null, totalIncome: { $sum: '$paidAmount' }, totalDue: { $sum: '$dueAmount' } } }]),
        Expense.aggregate([{ $match: expFilter }, { $group: { _id: '$category', total: { $sum: '$amount' } } }, { $sort: { total: -1 } }])
      ]);

      const totalExpense = expenseAgg.reduce((s, e) => s + e.totalExpense, 0);
      const totalIncome = feeAgg[0]?.totalIncome || 0;

      res.json({
        success: true,
        data: {
          totalIncome, totalExpense,
          netProfit: totalIncome - totalExpense,
          totalDue: feeAgg[0]?.totalDue || 0,
          monthlyExpenses: expenseAgg,
          expenseByCategory
        }
      });
    } catch (err) { next(err); }
  }
};

// ══════════════════════════════════════════════════════════════════════════════
// DASHBOARD CONTROLLER
// ══════════════════════════════════════════════════════════════════════════════

const dashboardController = {
  getSchoolAdminDashboard: async (req, res, next) => {
    try {
      const { Student, Teacher, Attendance, FeePayment, NoticeBoard, Leave } = req.tenantDb;
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const todayEnd = new Date(); todayEnd.setHours(23, 59, 59, 999);
      const currentYear = req.school.currentAcademicYear;

      const [
        totalStudents, totalTeachers,
        todayAttendance, feeCollection,
        pendingFees, recentAdmissions,
        pendingLeaves, recentNotices
      ] = await Promise.all([
        Student.countDocuments({ status: 'active', academicYear: currentYear }),
        Teacher.countDocuments({ status: 'active' }),
        Attendance.find({ date: { $gte: today, $lte: todayEnd } }).lean(),
        FeePayment.aggregate([
          { $match: { academicYear: currentYear } },
          { $group: { _id: null, collected: { $sum: '$paidAmount' }, due: { $sum: '$dueAmount' }, total: { $sum: '$totalAmount' } } }
        ]),
        FeePayment.countDocuments({ status: { $in: ['pending', 'partial', 'overdue'] }, academicYear: currentYear }),
        Student.find({ status: 'active' }).sort({ createdAt: -1 }).limit(5).populate('class', 'name').lean(),
        Leave.countDocuments({ status: 'pending' }),
        NoticeBoard.find({ isActive: true }).sort({ publishDate: -1 }).limit(5).lean()
      ]);

      let todayPresent = 0, todayAbsent = 0;
      todayAttendance.forEach(a => {
        a.records.forEach(r => {
          if (r.status === 'present' || r.status === 'late') todayPresent++;
          else todayAbsent++;
        });
      });

      res.json({
        success: true,
        data: {
          stats: {
            totalStudents, totalTeachers, pendingFees, pendingLeaves,
            todayAttendance: { present: todayPresent, absent: todayAbsent, total: todayPresent + todayAbsent, classesMarked: todayAttendance.length },
            feeCollection: feeCollection[0] || { collected: 0, due: 0, total: 0 }
          },
          recentAdmissions, recentNotices
        }
      });
    } catch (err) { next(err); }
  },

  getTeacherDashboard: async (req, res, next) => {
    try {
      const { Homework, NoticeBoard, Attendance, Leave } = req.tenantDb;
      const teacherId = req.user.profileId;
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const [homeworks, notices, pendingLeaves, todayAttendance] = await Promise.all([
        Homework.find({ assignedBy: teacherId, status: 'active' }).sort({ dueDate: 1 }).limit(5).lean(),
        NoticeBoard.find({ isActive: true, targetAudience: { $in: ['teachers', 'all'] } }).sort({ publishDate: -1 }).limit(5).lean(),
        Leave.countDocuments({ status: 'pending', applicantType: 'student' }),
        Attendance.find({ markedBy: teacherId, date: { $gte: today } }).lean()
      ]);

      res.json({ success: true, data: { homeworks, notices, pendingLeaves, todayMarked: todayAttendance.length } });
    } catch (err) { next(err); }
  },

  getStudentDashboard: async (req, res, next) => {
    try {
      const { Attendance, FeePayment, Homework, Result, NoticeBoard, Student } = req.tenantDb;
      const studentId = req.user.profileId;

      // Get student's class first
      const student = await Student.findById(studentId).lean();
      const homeworkFilter = { status: 'active', dueDate: { $gte: new Date() } };
      if (student?.class) homeworkFilter.classId = student.class;

      const [fees, homeworks, results, notices] = await Promise.all([
        FeePayment.find({ studentId, status: { $in: ['pending', 'partial', 'overdue'] } }).lean(),
        Homework.find(homeworkFilter).sort({ dueDate: 1 }).limit(5).lean(),
        Result.find({ studentId }).sort({ createdAt: -1 }).limit(5).lean(),
        NoticeBoard.find({ isActive: true, targetAudience: { $in: ['students', 'all'] } }).sort({ publishDate: -1 }).limit(3).lean()
      ]);

      const pendingFeeAmount = fees.reduce((s, f) => s + f.dueAmount, 0);

      res.json({ success: true, data: { pendingFees: fees.length, pendingFeeAmount, homeworks, results, notices } });
    } catch (err) { next(err); }
  }
};

module.exports = {
  homeworkController,
  noticeBoardController,
  leaveController,
  classController,
  timetableController,
  accountingController,
  dashboardController
};
