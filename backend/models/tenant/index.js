'use strict';

const StudentModel = require('./Student');
const TeacherModel = require('./Teacher');
const { ClassModel, AttendanceModel, TeacherAttendanceModel } = require('./Class');
const { FeeStructureModel, FeePaymentModel } = require('./Fees');
const { ExamModel, ResultModel } = require('./Exam');
const {
  HomeworkModel, NoticeBoardModel, LeaveModel,
  TimetableModel, ExpenseModel, ScholarshipModel
} = require('./Misc');
const NotificationModel = require('./Notification');

/**
 * Register all tenant models on a given Mongoose connection.
 * Returns an object with all models for that tenant.
 */
const getTenantModels = (connection) => {
  return {
    Student: StudentModel(connection),
    Teacher: TeacherModel(connection),
    Class: ClassModel(connection),
    Attendance: AttendanceModel(connection),
    TeacherAttendance: TeacherAttendanceModel(connection),
    FeeStructure: FeeStructureModel(connection),
    FeePayment: FeePaymentModel(connection),
    Exam: ExamModel(connection),
    Result: ResultModel(connection),
    Homework: HomeworkModel(connection),
    NoticeBoard: NoticeBoardModel(connection),
    Leave: LeaveModel(connection),
    Timetable: TimetableModel(connection),
    Expense: ExpenseModel(connection),
    Scholarship: ScholarshipModel(connection),
    Notification: NotificationModel(connection)
  };
};

module.exports = getTenantModels;
