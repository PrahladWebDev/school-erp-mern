'use strict';

const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const User = require('../models/global/User');
const School = require('../models/global/School');
const AppError = require('../utils/AppError');
const { logger } = require('../utils/logger');
const { getTenantConnection } = require('../config/database');
const getTenantModels = require('../models/tenant/index');

// ─── Helper: Send Token Response ──────────────────────────────────────────────
const sendTokenResponse = (user, statusCode, res, message = 'Success') => {
  const accessToken = user.generateAccessToken();
  const refreshToken = user.generateRefreshToken();

  // Save refresh token
  User.findByIdAndUpdate(user._id, { refreshToken }).catch(() => {});

  res.status(statusCode).json({
    success: true,
    message,
    data: {
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        mobile: user.mobile,
        role: user.role,
        schoolId: user.schoolId,
        schoolCode: user.schoolCode,
        avatar: user.avatar,
        preferences: user.preferences
      },
      accessToken,
      refreshToken,
      expiresIn: process.env.JWT_EXPIRES_IN || '7d'
    }
  });
};

// ─── @POST /api/auth/login ─────────────────────────────────────────────────────
const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return next(new AppError('Email and password are required', 400));
    }

    // Find user with password
    const user = await User.findOne({ email: email.toLowerCase().trim() })
      .select('+password +refreshToken');

    if (!user) {
      return next(new AppError('Invalid email or password', 401));
    }

    // Verify password
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return next(new AppError('Invalid email or password', 401));
    }

    // Check active
    if (!user.isActive) {
      return next(new AppError('Your account has been deactivated. Contact your administrator.', 401));
    }

    // Update last login info
    await User.findByIdAndUpdate(user._id, {
      $set: { lastLogin: new Date(), lastLoginIP: req.ip },
    });

    logger.info(`User logged in: ${user.email} (${user.role})`);
    sendTokenResponse(user, 200, res, 'Logged in successfully');
  } catch (err) {
    next(err);
  }
};

// ─── @POST /api/auth/refresh ───────────────────────────────────────────────────
const refreshToken = async (req, res, next) => {
  try {
    const { refreshToken: token } = req.body;
    if (!token) return next(new AppError('Refresh token required', 400));

    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_REFRESH_SECRET);
    } catch (err) {
      return next(new AppError('Invalid or expired refresh token', 401));
    }

    const user = await User.findById(decoded.id).select('+refreshToken');
    if (!user || user.refreshToken !== token) {
      return next(new AppError('Invalid refresh token', 401));
    }

    sendTokenResponse(user, 200, res, 'Token refreshed');
  } catch (err) {
    next(err);
  }
};

// ─── @POST /api/auth/logout ────────────────────────────────────────────────────
const logout = async (req, res, next) => {
  try {
    await User.findByIdAndUpdate(req.user._id, { $unset: { refreshToken: 1 } });
    res.json({ success: true, message: 'Logged out successfully' });
  } catch (err) {
    next(err);
  }
};

// ─── @GET /api/auth/me ─────────────────────────────────────────────────────────
const getMe = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id).lean();
    if (!user) return next(new AppError('User not found', 404));

    // Attach school info if applicable
    let school = null;
    if (user.schoolId) {
      school = await School.findById(user.schoolId)
        .select('name schoolCode logo primaryColor currentAcademicYear status address')
        .lean();
    }

    // For students: inject classId from their tenant Student record so
    // pages like StudentTimetablePage don't need an extra API call.
    const userOut = { ...user };
    if (user.role === 'student' && user.profileId && user.schoolId) {
      try {
        const tenantConn = await getTenantConnection(user.schoolId.toString());
        const { Student } = getTenantModels(tenantConn);
        const studentDoc = await Student.findById(user.profileId).select('class section').lean();
        if (studentDoc?.class) userOut.classId = studentDoc.class;
        if (studentDoc?.section) userOut.section = studentDoc.section;
      } catch {
        // non-fatal — frontend falls back to fetching the profile separately
      }
    }

    res.json({
      success: true,
      data: { user: userOut, school }
    });
  } catch (err) {
    next(err);
  }
};

// ─── @PUT /api/auth/change-password ───────────────────────────────────────────
const changePassword = async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return next(new AppError('Current and new passwords are required', 400));
    }
    if (newPassword.length < 8) {
      return next(new AppError('New password must be at least 8 characters', 400));
    }

    const user = await User.findById(req.user._id).select('+password');
    const isMatch = await user.comparePassword(currentPassword);
    if (!isMatch) {
      return next(new AppError('Current password is incorrect', 400));
    }

    user.password = newPassword;
    await user.save();

    res.json({ success: true, message: 'Password changed successfully' });
  } catch (err) {
    next(err);
  }
};

// ─── @POST /api/auth/forgot-password ──────────────────────────────────────────
const forgotPassword = async (req, res, next) => {
  try {
    const { email } = req.body;
    if (!email) return next(new AppError('Email is required', 400));

    const user = await User.findOne({ email: email.toLowerCase() });
    // Always return success to prevent email enumeration
    if (!user) {
      return res.json({
        success: true,
        message: 'If that email exists, a reset link has been sent.'
      });
    }

    const resetToken = user.generatePasswordResetToken();
    await user.save({ validateBeforeSave: false });

    // TODO: Send email with resetToken
    // await sendEmail({ to: user.email, subject: 'Password Reset', resetToken });

    logger.info(`Password reset requested for: ${user.email}`);
    res.json({
      success: true,
      message: 'Password reset link sent to your email.',
      ...(process.env.NODE_ENV === 'development' && { resetToken }) // Only in dev
    });
  } catch (err) {
    next(err);
  }
};

// ─── @POST /api/auth/reset-password/:token ────────────────────────────────────
const resetPassword = async (req, res, next) => {
  try {
    const hashedToken = crypto
      .createHash('sha256')
      .update(req.params.token)
      .digest('hex');

    const user = await User.findOne({
      passwordResetToken: hashedToken,
      passwordResetExpires: { $gt: Date.now() }
    });

    if (!user) {
      return next(new AppError('Password reset token is invalid or has expired', 400));
    }

    user.password = req.body.newPassword;
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;
    await user.save();

    sendTokenResponse(user, 200, res, 'Password reset successfully');
  } catch (err) {
    next(err);
  }
};

// ─── @PUT /api/auth/update-profile ────────────────────────────────────────────
const updateProfile = async (req, res, next) => {
  try {
    const allowedFields = ['name', 'mobile', 'preferences', 'avatar'];
    const updates = {};
    allowedFields.forEach(f => {
      if (req.body[f] !== undefined) updates[f] = req.body[f];
    });

    const user = await User.findByIdAndUpdate(req.user._id, updates, {
      new: true, runValidators: true
    });

    res.json({ success: true, message: 'Profile updated', data: { user } });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  login, refreshToken, logout, getMe,
  changePassword, forgotPassword, resetPassword, updateProfile
};
