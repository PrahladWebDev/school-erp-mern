'use strict';
const express = require('express');
const router = express.Router();
const { accountingController: ctrl } = require('../controllers/miscControllers');
const { protect, restrictTo, schoolBoundary } = require('../middleware/authMiddleware');

router.use(protect, restrictTo('super_admin', 'school_admin'), schoolBoundary);

router.get('/summary', ctrl.getFinancialSummary);
router.get('/expenses', ctrl.getAllExpenses);
router.post('/expenses', ctrl.createExpense);

module.exports = router;
