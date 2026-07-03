'use strict';

const mongoose = require('mongoose');

const documentSchema = new mongoose.Schema({
  name: { type: String, required: true },
  type: {
    type: String,
    enum: ['aadhaar', 'birth_certificate', 'transfer_certificate', 'marksheet', 'photo', 'other']
  },
  url: { type: String, required: true },
  publicId: { type: String },
  uploadedAt: { type: Date, default: Date.now }
}, { _id: true });

const guardianSchema = new mongoose.Schema({
  relation: {
    type: String,
    enum: ['father', 'mother', 'guardian'],
    required: true
  },
  name: { type: String, required: true, trim: true },
  mobile: {
    type: String,
    trim: true,
    match: [/^[6-9]\d{9}$/, 'Invalid mobile number']
  },
  occupation: { type: String, trim: true },
  aadhar: { type: String, trim: true },
  email: { type: String, lowercase: true, trim: true },
  userId: { type: mongoose.Schema.Types.ObjectId } // ref to global User
}, { _id: true });

const studentSchema = new mongoose.Schema({
  // Auto-generated
  admissionNumber: {
    type: String,
    unique: true,
    trim: true
  },
  rollNumber: { type: String, trim: true },

  // Personal
  firstName: { type: String, required: true, trim: true },
  lastName: { type: String, trim: true },
  gender: {
    type: String,
    enum: ['male', 'female', 'other'],
    required: true
  },
  dateOfBirth: { type: Date, required: true },
  bloodGroup: {
    type: String,
    enum: ['A+', 'A-', 'B+', 'B-', 'O+', 'O-', 'AB+', 'AB-', 'Unknown'],
    default: 'Unknown'
  },
  aadharNumber: { type: String, trim: true },
  religion: { type: String, trim: true },
  caste: { type: String, trim: true },
  category: {
    type: String,
    enum: ['General', 'OBC', 'SC', 'ST', 'NT', 'Other'],
    default: 'General'
  },
  nationality: { type: String, default: 'Indian' },
  motherTongue: { type: String, trim: true },

  // Contact
  mobileNumber: { type: String, trim: true },
  email: { type: String, lowercase: true, trim: true },
  emergencyContact: {
    name: { type: String, trim: true },
    relation: { type: String, trim: true },
    mobile: { type: String, trim: true }
  },

  // Address
  address: {
    current: {
      line1: { type: String, trim: true },
      village: { type: String, trim: true },
      taluka: { type: String, trim: true },
      district: { type: String, trim: true },
      state: { type: String, trim: true },
      pincode: { type: String, trim: true }
    },
    permanent: {
      line1: { type: String, trim: true },
      village: { type: String, trim: true },
      taluka: { type: String, trim: true },
      district: { type: String, trim: true },
      state: { type: String, trim: true },
      pincode: { type: String, trim: true }
    },
    sameAsCurrent: { type: Boolean, default: true }
  },

  // Guardians
  guardians: [guardianSchema],

  // Academic
  admissionDate: { type: Date, default: Date.now },
  class: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Class',
    required: true
  },
  section: { type: String, trim: true, uppercase: true },
  academicYear: { type: String, required: true },
  previousSchool: {
    name: { type: String, trim: true },
    class: { type: String, trim: true },
    percentage: { type: Number }
  },

  // Photo
  photo: {
    url: { type: String },
    publicId: { type: String }
  },

  // Documents
  documents: [documentSchema],

  // Promotion History
  promotionHistory: [{
    fromClass: { type: mongoose.Schema.Types.ObjectId, ref: 'Class' },
    fromClassName: { type: String },
    fromSection: { type: String },
    fromAcademicYear: { type: String },
    toClass: { type: mongoose.Schema.Types.ObjectId, ref: 'Class' },
    toClassName: { type: String },
    toSection: { type: String },
    toAcademicYear: { type: String },
    promotedAt: { type: Date, default: Date.now },
    promotedBy: { type: mongoose.Schema.Types.ObjectId }
  }],

  // Status
  status: {
    type: String,
    enum: ['active', 'inactive', 'transferred', 'graduated', 'dropout'],
    default: 'active'
  },
  transferDetails: {
    date: { type: Date },
    toSchool: { type: String },
    reason: { type: String },
    tcNumber: { type: String }
  },

  // Scholarship
  hasScholarship: { type: Boolean, default: false },

  // Auth
  userId: { type: mongoose.Schema.Types.ObjectId }, // ref global User

  // Metadata
  createdBy: { type: mongoose.Schema.Types.ObjectId },
  updatedBy: { type: mongoose.Schema.Types.ObjectId }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Virtuals
studentSchema.virtual('fullName').get(function () {
  return `${this.firstName} ${this.lastName || ''}`.trim();
});

studentSchema.virtual('age').get(function () {
  if (!this.dateOfBirth) return null;
  const today = new Date();
  const birthDate = new Date(this.dateOfBirth);
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) age--;
  return age;
});

// Indexes
studentSchema.index({ admissionNumber: 1 });
studentSchema.index({ class: 1, section: 1, academicYear: 1 });
studentSchema.index({ status: 1 });
studentSchema.index({ firstName: 'text', lastName: 'text', admissionNumber: 'text' });

// Auto-generate admission number
studentSchema.pre('save', async function (next) {
  if (!this.admissionNumber) {
    const year = new Date().getFullYear().toString().slice(-2);
    const count = await this.constructor.countDocuments();
    this.admissionNumber = `ADM${year}${String(count + 1).padStart(4, '0')}`;
  }
  next();
});

// Auto-assign roll number within the same class/section/academic year when left blank
studentSchema.pre('save', async function (next) {
  if (!this.rollNumber && this.class && this.academicYear) {
    const count = await this.constructor.countDocuments({
      class: this.class,
      section: this.section,
      academicYear: this.academicYear,
      _id: { $ne: this._id }
    });
    this.rollNumber = String(count + 1);
  }
  next();
});

module.exports = (connection) => connection.model('Student', studentSchema);
