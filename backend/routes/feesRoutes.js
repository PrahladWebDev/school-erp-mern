'use strict';
const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/feesController');
const { protect, restrictTo, schoolBoundary } = require('../middleware/authMiddleware');
const { validate, SCHEMAS } = require('../middleware/validateMiddleware');

router.use(protect, schoolBoundary);

router.get('/structures', ctrl.getAllFeeStructures);
router.post('/structures', restrictTo('super_admin', 'school_admin'), ctrl.createFeeStructure);
router.get('/pending', ctrl.getPendingFees);
router.get('/collection-report', ctrl.getFeeCollectionReport);
router.post('/assign', restrictTo('super_admin', 'school_admin'), validate(SCHEMAS.assignFee), ctrl.assignFeeToStudent);
router.get('/student/:studentId', ctrl.getStudentFees);
router.post('/:feePaymentId/collect', restrictTo('super_admin', 'school_admin'), ctrl.collectPayment);
router.get('/receipt/:receiptNumber', ctrl.getFeeReceipt);

module.exports = router;
