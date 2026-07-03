'use strict';

require('dotenv').config();
const mongoose = require('mongoose');
const { connectGlobalDB, getTenantConnection, buildTenantDbUri } = require('../config/database');
const User = require('../models/global/User');
const School = require('../models/global/School');
const { logger } = require('./logger');

// ─── Tenant model loader ───────────────────────────────────────────────────────
const getTenantModels = require('../models/tenant/index');
const loadTenantModels = (conn) => getTenantModels(conn);

// ─── 1. Super Admin ───────────────────────────────────────────────────────────
const seedSuperAdmin = async () => {
  const existing = await User.findOne({ role: 'super_admin' });
  if (existing) { console.log('Super admin already exists'); return; }

  await User.create({
    name: 'Super Administrator',
    email: process.env.SUPER_ADMIN_EMAIL || 'superadmin@schoolerp.com',
    mobile: '9999999999',
    password: process.env.SUPER_ADMIN_PASSWORD || 'SuperAdmin@123',
    role: 'super_admin',
    isActive: true,
    isEmailVerified: true
  });
  console.log('✅ Super admin created');
  console.log(`   Email   : ${process.env.SUPER_ADMIN_EMAIL || 'superadmin@schoolerp.com'}`);
  console.log(`   Password: ${process.env.SUPER_ADMIN_PASSWORD || 'SuperAdmin@123'}`);
};

// ─── 2. Demo School + Admin ───────────────────────────────────────────────────
const seedSampleSchool = async () => {
  let school = await School.findOne({ schoolCode: 'DEMO2024' });

  if (!school) {
  const dbName = 'school_demo2024';

    school = await School.create({
      schoolCode: 'DEMO2024',
      name: 'Gram Vidyalaya Demo School',
      shortName: 'GVD',
      type: 'primary',
      board: 'State Board',
      medium: 'Hindi',
      email: 'demo@gramvidyalaya.in',
      phone: '9876543210',
      address: {
        line1: 'Near Gram Panchayat',
        village: 'Chandpur',
        taluka: 'Kopargaon',
        district: 'Ahmednagar',
        state: 'Maharashtra',
        pincode: '423601'
      },
     dbUri: buildTenantDbUri(dbName),
      dbName,
      adminEmail: 'admin@gramvidyalaya.in',
      currentAcademicYear: '2024-2025',
      status: 'active',
      isVerified: true
    });

    const adminUser = await User.create({
      name: 'School Administrator',
      email: 'admin@gramvidyalaya.in',
      mobile: '9876543210',
      password: 'Admin@1234',
      role: 'school_admin',
      schoolId: school._id,
      schoolCode: school.schoolCode,
      isActive: true
    });
    await School.findByIdAndUpdate(school._id, { adminUserId: adminUser._id });
    console.log('✅ Demo school + admin created');
  } else {
    console.log('Demo school already exists — seeding tenant data');
  }

  return school;
};

// ─── 3. Tenant Data (Classes, Teachers, Students, Parents) ───────────────────
const seedTenantData = async (school) => {
  const conn = await getTenantConnection(
    school._id.toString(),
    school.dbUri
  );
  const { Teacher, Student, Class } = loadTenantModels(conn);

  const AY = '2024-2025';

  // ── Classes ──────────────────────────────────────────────────────────────────
  let existingClasses = await Class.find({ academicYear: AY });
  if (existingClasses.length === 0) {
    const classData = [
      { name: 'Class 1', numericName: 1, sections: ['A'], academicYear: AY, subjects: [
        { name: 'Hindi', maxMarks: 100, passMarks: 35 },
        { name: 'Mathematics', maxMarks: 100, passMarks: 35 },
        { name: 'Environmental Studies', maxMarks: 100, passMarks: 35 },
      ]},
      { name: 'Class 2', numericName: 2, sections: ['A'], academicYear: AY, subjects: [
        { name: 'Hindi', maxMarks: 100, passMarks: 35 },
        { name: 'Mathematics', maxMarks: 100, passMarks: 35 },
        { name: 'Environmental Studies', maxMarks: 100, passMarks: 35 },
      ]},
      { name: 'Class 3', numericName: 3, sections: ['A', 'B'], academicYear: AY, subjects: [
        { name: 'Hindi', maxMarks: 100, passMarks: 35 },
        { name: 'English', maxMarks: 100, passMarks: 35 },
        { name: 'Mathematics', maxMarks: 100, passMarks: 35 },
        { name: 'Science', maxMarks: 100, passMarks: 35 },
      ]},
      { name: 'Class 4', numericName: 4, sections: ['A', 'B'], academicYear: AY, subjects: [
        { name: 'Hindi', maxMarks: 100, passMarks: 35 },
        { name: 'English', maxMarks: 100, passMarks: 35 },
        { name: 'Mathematics', maxMarks: 100, passMarks: 35 },
        { name: 'Science', maxMarks: 100, passMarks: 35 },
        { name: 'Social Studies', maxMarks: 100, passMarks: 35 },
      ]},
      { name: 'Class 5', numericName: 5, sections: ['A', 'B'], academicYear: AY, subjects: [
        { name: 'Hindi', maxMarks: 100, passMarks: 35 },
        { name: 'English', maxMarks: 100, passMarks: 35 },
        { name: 'Mathematics', maxMarks: 100, passMarks: 35 },
        { name: 'Science', maxMarks: 100, passMarks: 35 },
        { name: 'Social Studies', maxMarks: 100, passMarks: 35 },
      ]},
    ];
    existingClasses = await Class.insertMany(classData);
    console.log(`✅ Created ${existingClasses.length} classes`);
  }

  const classMap = {};
  existingClasses.forEach(c => { classMap[c.numericName] = c; });

  // ── Teachers ─────────────────────────────────────────────────────────────────
  const teacherSeeds = [
    {
      firstName: 'Ramesh', lastName: 'Patil', gender: 'male',
      dateOfBirth: new Date('1980-05-15'),
      mobile: '9876500001', email: 'ramesh.patil@demo2024.school',
      designation: 'head_teacher', qualification: 'M.Ed',
      experience: 15, basicSalary: 35000,
      subjects: ['Hindi', 'Social Studies'],
      joiningDate: new Date('2010-06-01'),
      employmentType: 'permanent',
      address: { village: 'Chandpur', district: 'Ahmednagar', state: 'Maharashtra' }
    },
    {
      firstName: 'Sunita', lastName: 'Shinde', gender: 'female',
      dateOfBirth: new Date('1985-08-20'),
      mobile: '9876500002', email: 'sunita.shinde@demo2024.school',
      designation: 'teacher', qualification: 'B.Ed',
      experience: 8, basicSalary: 25000,
      subjects: ['Mathematics', 'Science'],
      joiningDate: new Date('2016-07-01'),
      employmentType: 'permanent',
      address: { village: 'Kopargaon', district: 'Ahmednagar', state: 'Maharashtra' }
    },
    {
      firstName: 'Prakash', lastName: 'More', gender: 'male',
      dateOfBirth: new Date('1990-03-10'),
      mobile: '9876500003', email: 'prakash.more@demo2024.school',
      designation: 'assistant_teacher', qualification: 'B.Ed',
      experience: 4, basicSalary: 18000,
      subjects: ['English', 'Environmental Studies'],
      joiningDate: new Date('2020-06-15'),
      employmentType: 'contract',
      address: { village: 'Shirdi', district: 'Ahmednagar', state: 'Maharashtra' }
    },
  ];

  const createdTeachers = [];
  for (const t of teacherSeeds) {
    const exists = await Teacher.findOne({ email: t.email });
    if (exists) { createdTeachers.push(exists); continue; }

    const teacher = await Teacher.create(t);

    // Create login account
    const password = 'Teacher@1234';
    const userAccount = await User.create({
      name: `${t.firstName} ${t.lastName}`,
      email: t.email,
      mobile: t.mobile,
      password,
      role: 'teacher',
      schoolId: school._id,
      schoolCode: school.schoolCode,
      profileId: teacher._id.toString(),
      profileType: 'Teacher',
      isActive: true
    });
    await Teacher.findByIdAndUpdate(teacher._id, { userId: userAccount._id });
    createdTeachers.push(teacher);
  }
  console.log(`✅ ${createdTeachers.length} teachers ready`);

  // ── Students + Parents ───────────────────────────────────────────────────────
  const studentSeeds = [
    // Class 5-A
    {
      firstName: 'Arjun', lastName: 'Deshmukh', gender: 'male',
      dateOfBirth: new Date('2014-04-12'), class: classMap[5]._id, section: 'A',
      academicYear: AY, category: 'General', mobileNumber: '9765000101',
      guardians: [
        { relation: 'father', name: 'Vijay Deshmukh', mobile: '9765000100', occupation: 'Farmer' },
        { relation: 'mother', name: 'Lata Deshmukh', mobile: '9765000101', occupation: 'Homemaker' }
      ],
      address: { current: { village: 'Chandpur', district: 'Ahmednagar', state: 'Maharashtra', pincode: '423601' } }
    },
    {
      firstName: 'Priya', lastName: 'Jadhav', gender: 'female',
      dateOfBirth: new Date('2014-07-25'), class: classMap[5]._id, section: 'A',
      academicYear: AY, category: 'OBC', mobileNumber: '9765000201',
      guardians: [
        { relation: 'father', name: 'Suresh Jadhav', mobile: '9765000200', occupation: 'Teacher' },
        { relation: 'mother', name: 'Meena Jadhav', mobile: '9765000201', occupation: 'Homemaker' }
      ],
      address: { current: { village: 'Kopargaon', district: 'Ahmednagar', state: 'Maharashtra', pincode: '423601' } }
    },
    // Class 4-A
    {
      firstName: 'Rahul', lastName: 'Kale', gender: 'male',
      dateOfBirth: new Date('2015-01-08'), class: classMap[4]._id, section: 'A',
      academicYear: AY, category: 'SC', mobileNumber: '9765000301',
      guardians: [
        { relation: 'father', name: 'Manoj Kale', mobile: '9765000300', occupation: 'Daily Wage' },
      ],
      address: { current: { village: 'Takli', district: 'Ahmednagar', state: 'Maharashtra', pincode: '423603' } }
    },
    {
      firstName: 'Sneha', lastName: 'Pawar', gender: 'female',
      dateOfBirth: new Date('2015-09-14'), class: classMap[4]._id, section: 'B',
      academicYear: AY, category: 'General', mobileNumber: '9765000401',
      guardians: [
        { relation: 'mother', name: 'Asha Pawar', mobile: '9765000400', occupation: 'Nurse' },
      ],
      address: { current: { village: 'Chandpur', district: 'Ahmednagar', state: 'Maharashtra', pincode: '423601' } }
    },
    // Class 3-A
    {
      firstName: 'Sanjay', lastName: 'Nikam', gender: 'male',
      dateOfBirth: new Date('2016-03-22'), class: classMap[3]._id, section: 'A',
      academicYear: AY, category: 'OBC', mobileNumber: '9765000501',
      guardians: [
        { relation: 'father', name: 'Dilip Nikam', mobile: '9765000500', occupation: 'Shop Owner' },
        { relation: 'mother', name: 'Rekha Nikam', mobile: '9765000501', occupation: 'Homemaker' }
      ],
      address: { current: { village: 'Belapur', district: 'Ahmednagar', state: 'Maharashtra', pincode: '423605' } }
    },
  ];

  const studentCreds = [];
  for (const s of studentSeeds) {
    const exists = await Student.findOne({ firstName: s.firstName, lastName: s.lastName, academicYear: AY });
    if (exists) { studentCreds.push({ name: `${s.firstName} ${s.lastName}`, note: 'already exists' }); continue; }

    const student = await Student.create(s);

    // Student login
    const studentEmail = `${student.admissionNumber.toLowerCase()}@demo2024.school`;
    const studentPassword = 'Student@1234';
    const studentUser = await User.create({
      name: `${s.firstName} ${s.lastName}`,
      email: studentEmail,
      mobile: s.mobileNumber,
      password: studentPassword,
      role: 'student',
      schoolId: school._id,
      schoolCode: school.schoolCode,
      profileId: student._id.toString(),
      profileType: 'Student',
      isActive: true
    });
    await Student.findByIdAndUpdate(student._id, { userId: studentUser._id });

    // Parent logins
    const parentCreds = [];
    for (const g of s.guardians) {
      if (!g.mobile) continue;
      const parentEmail = `parent.${g.mobile}@demo2024.school`;
      const existing = await User.findOne({ email: parentEmail });
      if (!existing) {
        const parentPassword = 'Parent@1234';
        await User.create({
          name: g.name,
          email: parentEmail,
          mobile: g.mobile,
          password: parentPassword,
          role: 'parent',
          schoolId: school._id,
          schoolCode: school.schoolCode,
          profileId: student._id.toString(),
          profileType: 'Parent',
          isActive: true
        });
        parentCreds.push({ name: g.name, relation: g.relation, email: parentEmail, password: parentPassword });
      }
    }

    studentCreds.push({
      name: `${s.firstName} ${s.lastName}`,
      studentEmail, studentPassword,
      parents: parentCreds
    });
  }
  console.log(`✅ ${studentCreds.length} students ready`);

  return { teacherSeeds, studentCreds };
};

// ─── Main ─────────────────────────────────────────────────────────────────────
const runSeeder = async () => {
  try {
    await connectGlobalDB();
    console.log('🌱 Starting database seeder...');

    await seedSuperAdmin();
    const school = await seedSampleSchool();
    const { teacherSeeds, studentCreds } = await seedTenantData(school);

    console.log('');
    console.log('══════════════════════════════════════════════════');
    console.log('             SEED CREDENTIALS SUMMARY             ');
    console.log('══════════════════════════════════════════════════');
    console.log('');
    console.log('🔐 SUPER ADMIN');
    console.log(`   Email   : ${process.env.SUPER_ADMIN_EMAIL || 'superadmin@schoolerp.com'}`);
    console.log(`   Password: ${process.env.SUPER_ADMIN_PASSWORD || 'SuperAdmin@123'}`);
    console.log('');
    console.log('🏫 SCHOOL ADMIN  (School Code: DEMO2024)');
    console.log('   Email   : admin@gramvidyalaya.in');
    console.log('   Password: Admin@1234');
    console.log('');
    console.log('👨‍🏫 TEACHERS  (password: Teacher@1234)');
    teacherSeeds.forEach(t => console.log(`   ${t.email}`));

    console.log('');
    console.log('👨‍🎓 STUDENTS  (password: Student@1234)');
    studentCreds.forEach(s => s.studentEmail && console.log(`   ${s.studentEmail}`));
    console.log('');
    console.log('👪 PARENTS  (password: Parent@1234)');
    studentCreds.forEach(s => (s.parents || []).forEach(p => console.log(`   ${p.email}`)));
    console.log('');
    console.log('══════════════════════════════════════════════════');
    console.log('✅ Seeding completed successfully!');

    process.exit(0);
  } catch (err) {
    logger.error('Seeding failed:', err);
    process.exit(1);
  }
};

runSeeder();
