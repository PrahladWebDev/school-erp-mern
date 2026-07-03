'use strict';

const mongoose = require('mongoose');

const subscriptionPlanSchema = new mongoose.Schema({
  planName: {
    type: String,
    enum: ['free', 'basic', 'standard', 'premium', 'enterprise'],
    default: 'basic'
  },
  maxStudents: { type: Number, default: 200 },
  maxTeachers: { type: Number, default: 20 },
  features: [{ type: String }],
  price: { type: Number, default: 0 },
  billingCycle: { type: String, enum: ['monthly', 'yearly'], default: 'monthly' },
  startDate: { type: Date, default: Date.now },
  endDate: { type: Date },
  isActive: { type: Boolean, default: true }
});

const schoolSchema = new mongoose.Schema({
  // Identification
  schoolCode: {
    type: String,
    unique: true,
    uppercase: true,
    trim: true,
    required: true
  },
  slug: {
    type: String,
    unique: true,
    lowercase: true,
    trim: true
  },

  // Basic Info
  name: { type: String, required: true, trim: true },
  shortName: { type: String, trim: true },
  type: {
    type: String,
    enum: ['primary', 'secondary', 'higher_secondary', 'coaching', 'college', 'other'],
    default: 'primary'
  },
  board: {
    type: String,
    enum: ['CBSE', 'ICSE', 'State Board', 'IB', 'NIOS', 'Other'],
    default: 'State Board'
  },
  medium: { type: String, trim: true, default: 'Hindi' },

  // Contact
  email: { type: String, lowercase: true, trim: true },
  phone: { type: String, trim: true },
  website: { type: String, trim: true },

  // Address
  address: {
    line1: { type: String, trim: true },
    line2: { type: String, trim: true },
    village: { type: String, trim: true },
    taluka: { type: String, trim: true },
    district: { type: String, trim: true },
    state: { type: String, trim: true, default: 'Maharashtra' },
    pincode: { type: String, trim: true },
    country: { type: String, default: 'India' }
  },

  // Branding
  logo: {
    url: { type: String },
    publicId: { type: String }
  },
  primaryColor: { type: String, default: '#1a56db' },
  secondaryColor: { type: String, default: '#ffffff' },

  // Location (for map)
  location: {
    lat: { type: Number },
    lng: { type: Number }
  },

  // Database Config (Multi-tenant)
  dbUri: {
    type: String,
    required: true,
    select: false // Never expose DB URI
  },
  dbName: { type: String, required: true },

  // Admin
  adminUserId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  adminEmail: { type: String, lowercase: true, trim: true },

  // Subscription
  subscription: { type: subscriptionPlanSchema, default: () => ({}) },

  // Academic
  currentAcademicYear: { type: String, default: () => {
    const now = new Date();
    const year = now.getMonth() >= 5 ? now.getFullYear() : now.getFullYear() - 1;
    return `${year}-${year + 1}`;
  }},
  workingDays: {
    type: [String],
    default: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
  },

  // Status
  status: {
    type: String,
    enum: ['active', 'inactive', 'suspended', 'pending'],
    default: 'active'
  },
  isVerified: { type: Boolean, default: false },
  setupCompleted: { type: Boolean, default: false },

  // Stats (cached for performance)
  stats: {
    totalStudents: { type: Number, default: 0 },
    totalTeachers: { type: Number, default: 0 },
    lastUpdated: { type: Date }
  },

  // Metadata
  registeredAt: { type: Date, default: Date.now },
  updatedAt: { type: Date }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes
schoolSchema.index({ schoolCode: 1 });
schoolSchema.index({ slug: 1 });
schoolSchema.index({ status: 1 });
schoolSchema.index({ 'subscription.planName': 1 });

// Auto-generate slug
schoolSchema.pre('save', function (next) {
  if (this.isModified('name') && !this.slug) {
    this.slug = this.name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');
  }
  next();
});

module.exports = mongoose.model('School', schoolSchema);
