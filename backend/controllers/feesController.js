'use strict';

const AppError = require('../utils/AppError');
const pdfService = require('../services/pdfService');
const { notify, resolveStudentRecipients } = require('../services/notificationService');

// ─── FEE STRUCTURE ─────────────────────────────────────────────────────────────

const createFeeStructure = async (req, res, next) => {
  try {
    const { FeeStructure } = req.tenantDb;
    const structure = await FeeStructure.create({
      ...req.body,
      createdBy: req.user._id,
      createdByName: req.user.name || req.user.firstName || 'Admin',
      createdByRole: req.user.role
    });
    res.status(201).json({ success: true, message: 'Fee structure created', data: { structure } });
  } catch (err) { next(err); }
};

const getAllFeeStructures = async (req, res, next) => {
  try {
    const { FeeStructure } = req.tenantDb;
    const { academicYear, classId, isActive } = req.query;
    const filter = {};
    if (academicYear) filter.academicYear = academicYear;
    if (classId) filter.classId = classId;
    if (isActive !== undefined) filter.isActive = isActive === 'true';

    const structures = await FeeStructure.find(filter)
      .populate('classId', 'name')
      .sort({ createdAt: -1 })
      .lean();

    res.json({ success: true, data: { structures } });
  } catch (err) { next(err); }
};

// ─── FEE COLLECTION ────────────────────────────────────────────────────────────

const assignFeeToStudent = async (req, res, next) => {
  try {
    const { FeePayment, FeeStructure, Student } = req.tenantDb;
    const { studentId, feeStructureId, discount, discountReason, dueDate } = req.body;

    const [student, structure] = await Promise.all([
      Student.findById(studentId).populate('class', 'name'),
      FeeStructure.findById(feeStructureId)
    ]);

    if (!student) return next(new AppError('Student not found', 404));
    if (!structure) return next(new AppError('Fee structure not found', 404));

    // Create fee payments for each fee item
    const payments = await Promise.all(
      structure.feeItems.map(item =>
        FeePayment.create({
          studentId,
          studentName: `${student.firstName} ${student.lastName || ''}`.trim(),
          admissionNumber: student.admissionNumber,
          classId: student.class._id,
          className: student.class.name,
          section: student.section,
          academicYear: structure.academicYear,
          feeStructureId,
          feeType: item.feeType,
          feeLabel: item.label,
          totalAmount: item.amount,
          discount: discount || 0,
          discountReason,
          dueDate: dueDate || item.dueDate,
          createdBy: req.user._id
        })
      )
    );

    res.status(201).json({
      success: true,
      message: `${payments.length} fee records created for student`,
      data: { payments }
    });
  } catch (err) { next(err); }
};

const collectPayment = async (req, res, next) => {
  try {
    const { FeePayment } = req.tenantDb;
    const { feePaymentId } = req.params;
    const { amount, paymentMode, transactionId, chequeNumber, bankName, remarks } = req.body;

    const feeRecord = await FeePayment.findById(feePaymentId);
    if (!feeRecord) return next(new AppError('Fee record not found', 404));

    if (amount > feeRecord.dueAmount + 0.01) {
      return next(new AppError(`Amount exceeds due amount of ₹${feeRecord.dueAmount}`, 400));
    }

    // Generate receipt number
    const year = new Date().getFullYear().toString().slice(-2);
    const count = await FeePayment.countDocuments();
    const receiptNumber = `RCP${year}${String(count + 1).padStart(6, '0')}`;

    feeRecord.paymentHistory.push({
      amount,
      paymentMode,
      transactionId,
      chequeNumber,
      bankName,
      receiptNumber,
      collectedBy: req.user._id,
      remarks,
      paymentDate: new Date()
    });

    await feeRecord.save(); // triggers pre-save to recalculate totals

    const recipientIds = await resolveStudentRecipients(req.tenantDb, [feeRecord.studentId], { students: true, guardians: true });
    await notify(req.tenantDb, {
      title: 'Fee Payment Received',
      message: `Payment of ₹${amount} received. Receipt No: ${receiptNumber}.${feeRecord.dueAmount > 0 ? ` Remaining due: ₹${feeRecord.dueAmount}.` : ''}`,
      type: 'fees',
      recipientIds,
      relatedId: feeRecord._id,
      createdBy: req.user._id,
      createdByName: req.user.name,
      schoolId: req.schoolId
    });

    res.json({
      success: true,
      message: 'Payment collected successfully',
      data: { feeRecord, receiptNumber }
    });
  } catch (err) { next(err); }
};

const getStudentFees = async (req, res, next) => {
  try {
    const { FeePayment } = req.tenantDb;
    const { studentId } = req.params;
    const { academicYear } = req.query;

    const filter = { studentId };
    if (academicYear) filter.academicYear = academicYear;

    const fees = await FeePayment.find(filter).sort({ createdAt: 1 }).lean();

    const summary = {
      totalAmount: fees.reduce((s, f) => s + f.totalAmount, 0),
      paidAmount: fees.reduce((s, f) => s + f.paidAmount, 0),
      dueAmount: fees.reduce((s, f) => s + f.dueAmount, 0),
      discount: fees.reduce((s, f) => s + f.discount, 0),
      totalFees: fees.length,
      paidFees: fees.filter(f => f.status === 'paid').length,
      pendingFees: fees.filter(f => ['pending', 'partial', 'overdue'].includes(f.status)).length
    };

    res.json({ success: true, data: { fees, summary } });
  } catch (err) { next(err); }
};

const getPendingFees = async (req, res, next) => {
  try {
    const { FeePayment } = req.tenantDb;
    const { page = 1, limit = 20, classId, academicYear, status } = req.query;

    const filter = { status: { $in: ['pending', 'partial', 'overdue'] } };
    if (classId) filter.classId = classId;
    if (academicYear) filter.academicYear = academicYear;
    if (status && ['pending', 'partial', 'overdue'].includes(status)) filter.status = status;

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [fees, total] = await Promise.all([
      FeePayment.find(filter)
        .sort({ dueAmount: -1 })
        .skip(skip)
        .limit(parseInt(limit))
        .lean(),
      FeePayment.countDocuments(filter)
    ]);

    const totalDue = await FeePayment.aggregate([
      { $match: filter },
      { $group: { _id: null, totalDue: { $sum: '$dueAmount' } } }
    ]);

    res.json({
      success: true,
      data: {
        fees,
        totalDueAmount: totalDue[0]?.totalDue || 0,
        pagination: { total, page: parseInt(page), limit: parseInt(limit), pages: Math.ceil(total / parseInt(limit)) }
      }
    });
  } catch (err) { next(err); }
};

const getFeeReceipt = async (req, res, next) => {
  try {
    const { FeePayment } = req.tenantDb;
    const { receiptNumber } = req.params;

    const feeRecord = await FeePayment.findOne({
      'paymentHistory.receiptNumber': receiptNumber
    }).lean();

    if (!feeRecord) return next(new AppError('Receipt not found', 404));

    const payment = feeRecord.paymentHistory.find(p => p.receiptNumber === receiptNumber);

    const receiptData = {
      receiptNumber,
      schoolName: req.school.name,
      schoolAddress: req.school.address,
      schoolLogo: req.school.logo?.url,
      studentName: feeRecord.studentName,
      admissionNumber: feeRecord.admissionNumber,
      className: feeRecord.className,
      section: feeRecord.section,
      academicYear: feeRecord.academicYear,
      feeLabel: feeRecord.feeLabel,
      totalAmount: feeRecord.totalAmount,
      paidAmount: payment.amount,
      dueAmount: feeRecord.dueAmount,
      paymentDate: payment.paymentDate,
      paymentMode: payment.paymentMode,
      transactionId: payment.transactionId
    };

    const pdfBuffer = await pdfService.generateFeeReceipt(receiptData);

    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `inline; filename="receipt-${receiptNumber}.pdf"`,
      'Content-Length': pdfBuffer.length
    });

    res.send(pdfBuffer);
  } catch (err) { next(err); }
};

const getFeeCollectionReport = async (req, res, next) => {
  try {
    const { FeePayment } = req.tenantDb;
    const { startDate, endDate, classId, academicYear } = req.query;

    const matchStage = {};
    if (academicYear) matchStage.academicYear = academicYear;
    if (classId) matchStage.classId = require('mongoose').Types.ObjectId.createFromHexString(classId);

    const dateFilter = {};
    if (startDate) dateFilter.$gte = new Date(startDate);
    if (endDate) dateFilter.$lte = new Date(endDate);

    const pipeline = [
      { $match: matchStage },
      { $unwind: '$paymentHistory' },
      ...(Object.keys(dateFilter).length ? [{ $match: { 'paymentHistory.paymentDate': dateFilter } }] : []),
      {
        $group: {
          _id: {
            date: { $dateToString: { format: '%Y-%m-%d', date: '$paymentHistory.paymentDate' } },
            mode: '$paymentHistory.paymentMode'
          },
          totalCollected: { $sum: '$paymentHistory.amount' },
          count: { $sum: 1 }
        }
      },
      { $sort: { '_id.date': -1 } }
    ];

    const report = await FeePayment.aggregate(pipeline);

    const summary = await FeePayment.aggregate([
      { $match: matchStage },
      {
        $group: {
          _id: null,
          totalFees: { $sum: '$totalAmount' },
          totalPaid: { $sum: '$paidAmount' },
          totalDue: { $sum: '$dueAmount' },
          totalDiscount: { $sum: '$discount' }
        }
      }
    ]);

    res.json({
      success: true,
      data: { report, summary: summary[0] || {} }
    });
  } catch (err) { next(err); }
};

module.exports = {
  createFeeStructure, getAllFeeStructures,
  assignFeeToStudent, collectPayment,
  getStudentFees, getPendingFees,
  getFeeReceipt, getFeeCollectionReport
};
