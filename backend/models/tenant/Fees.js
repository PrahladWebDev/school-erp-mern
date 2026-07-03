'use strict';

const mongoose = require('mongoose');

// ─── FEE STRUCTURE ─────────────────────────────────────────────────────────────
const feeStructureSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  academicYear: { type: String, required: true },
  classId: { type: mongoose.Schema.Types.ObjectId, ref: 'Class' },
  className: { type: String },
  applicableTo: {
    type: String,
    enum: ['all', 'class', 'section'],
    default: 'all'
  },
  feeItems: [{
    feeType: {
      type: String,
      enum: [
        'tuition_fee', 'admission_fee', 'exam_fee', 'sports_fee',
        'library_fee', 'lab_fee', 'transport_fee', 'hostel_fee',
        'computer_fee', 'activity_fee', 'other'
      ],
      required: true
    },
    label: { type: String, required: true },
    amount: { type: Number, required: true },
    frequency: {
      type: String,
      enum: ['one_time', 'monthly', 'quarterly', 'yearly'],
      default: 'yearly'
    },
    dueDate: { type: Date },
    isOptional: { type: Boolean, default: false }
  }],
  totalAmount: { type: Number },
  isActive: { type: Boolean, default: true },
  createdBy: { type: mongoose.Schema.Types.ObjectId },
  createdByName: { type: String },
  createdByRole: { type: String }
}, { timestamps: true });

// Auto-calc total
feeStructureSchema.pre('save', function (next) {
  this.totalAmount = this.feeItems.reduce((sum, item) => sum + item.amount, 0);
  next();
});

// ─── FEE PAYMENT ──────────────────────────────────────────────────────────────
const paymentHistorySchema = new mongoose.Schema({
  amount: { type: Number, required: true },
  paymentDate: { type: Date, default: Date.now },
  paymentMode: {
    type: String,
    enum: ['cash', 'cheque', 'online', 'upi', 'bank_transfer', 'dd'],
    required: true
  },
  transactionId: { type: String, trim: true },
  chequeNumber: { type: String },
  bankName: { type: String },
  receiptNumber: { type: String, unique: true },
  collectedBy: { type: mongoose.Schema.Types.ObjectId },
  remarks: { type: String },
  isRefund: { type: Boolean, default: false }
}, { _id: true });

const feePaymentSchema = new mongoose.Schema({
  studentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Student',
    required: true
  },
  studentName: { type: String },
  admissionNumber: { type: String },
  classId: { type: mongoose.Schema.Types.ObjectId, ref: 'Class' },
  className: { type: String },
  section: { type: String },
  academicYear: { type: String, required: true },
  feeStructureId: { type: mongoose.Schema.Types.ObjectId, ref: 'FeeStructure' },
  feeType: { type: String },
  feeLabel: { type: String },
  totalAmount: { type: Number, required: true },
  paidAmount: { type: Number, default: 0 },
  dueAmount: { type: Number },
  discount: { type: Number, default: 0 },
  discountReason: { type: String },
  scholarship: { type: Number, default: 0 },
  lateFee: { type: Number, default: 0 },
  dueDate: { type: Date },
  paymentHistory: [paymentHistorySchema],
  status: {
    type: String,
    enum: ['pending', 'partial', 'paid', 'overdue', 'waived'],
    default: 'pending'
  },
  remarks: { type: String },
  createdBy: { type: mongoose.Schema.Types.ObjectId }
}, {
  timestamps: true,
  toJSON: { virtuals: true }
});

// Auto-calc due
feePaymentSchema.pre('save', function (next) {
  this.paidAmount = this.paymentHistory
    .filter(p => !p.isRefund)
    .reduce((sum, p) => sum + p.amount, 0);
  const refunds = this.paymentHistory
    .filter(p => p.isRefund)
    .reduce((sum, p) => sum + p.amount, 0);
  this.paidAmount = Math.max(0, this.paidAmount - refunds);
  this.dueAmount = Math.max(0, this.totalAmount - this.discount - this.scholarship - this.paidAmount);

  if (this.paidAmount === 0) this.status = 'pending';
  else if (this.dueAmount === 0) this.status = 'paid';
  else this.status = 'partial';

  if (this.dueDate && this.dueAmount > 0 && new Date() > this.dueDate) {
    this.status = 'overdue';
  }
  next();
});

feePaymentSchema.index({ studentId: 1, academicYear: 1 });
feePaymentSchema.index({ status: 1, academicYear: 1 });
feePaymentSchema.index({ classId: 1, academicYear: 1 });

// Auto-generate receipt number
feePaymentSchema.methods.generateReceipt = async function () {
  const year = new Date().getFullYear().toString().slice(-2);
  const count = await this.constructor.countDocuments();
  return `RCP${year}${String(count + 1).padStart(6, '0')}`;
};

module.exports = {
  FeeStructureModel: (conn) => conn.model('FeeStructure', feeStructureSchema),
  FeePaymentModel: (conn) => conn.model('FeePayment', feePaymentSchema)
};
