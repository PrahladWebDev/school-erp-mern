'use strict';

const PDFDocument = require('pdfkit');

// ─── Helper: Create base PDF document ─────────────────────────────────────────
const createDoc = () => {
  return new PDFDocument({
    size: 'A4',
    margin: 40,
    info: { Title: 'School ERP Document', Author: 'Rural School ERP' }
  });
};

const bufferFromDoc = (doc) => {
  return new Promise((resolve, reject) => {
    const chunks = [];
    doc.on('data', chunk => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);
  });
};

// ─── School Header ─────────────────────────────────────────────────────────────
const drawSchoolHeader = (doc, school, title) => {
  const pageWidth = doc.page.width - 80;

  // Border box
  doc.rect(30, 30, doc.page.width - 60, 90).stroke('#1a56db');

  // School name
  doc.fontSize(18).fillColor('#1a56db').font('Helvetica-Bold')
    .text(school.name || 'School Name', 40, 45, { width: pageWidth, align: 'center' });

  // Address
  const addr = school.address;
  if (addr) {
    const addrStr = [addr.line1, addr.village, addr.district, addr.state, addr.pincode]
      .filter(Boolean).join(', ');
    doc.fontSize(9).fillColor('#555').font('Helvetica')
      .text(addrStr, 40, 68, { width: pageWidth, align: 'center' });
  }

  if (school.phone || school.email) {
    doc.fontSize(8).fillColor('#555')
      .text(`Ph: ${school.phone || ''} | Email: ${school.email || ''}`, 40, 82, { width: pageWidth, align: 'center' });
  }

  // Document title bar
  doc.rect(30, 122, doc.page.width - 60, 22).fill('#1a56db');
  doc.fontSize(11).fillColor('#ffffff').font('Helvetica-Bold')
    .text(title, 40, 128, { width: pageWidth, align: 'center' });

  doc.fillColor('#000').font('Helvetica');
  return 155; // return Y position after header
};

// ─── Fee Receipt ───────────────────────────────────────────────────────────────
const generateFeeReceipt = async (data) => {
  const doc = createDoc();
  const bufferPromise = bufferFromDoc(doc);

  const {
    receiptNumber, schoolName, schoolAddress, studentName, admissionNumber,
    className, section, academicYear, feeLabel, totalAmount,
    paidAmount, dueAmount, paymentDate, paymentMode, transactionId
  } = data;

  const school = { name: schoolName, address: schoolAddress, phone: data.schoolPhone, email: data.schoolEmail };

  let y = drawSchoolHeader(doc, school, 'FEE RECEIPT');

  // Receipt metadata
  doc.fontSize(9).fillColor('#333');
  doc.text(`Receipt No: ${receiptNumber}`, 40, y + 10);
  doc.text(`Date: ${new Date(paymentDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}`, 420, y + 10);

  y += 35;

  // Student info table
  const infoData = [
    ['Student Name', studentName, 'Admission No.', admissionNumber],
    ['Class', `${className}${section ? ` - ${section}` : ''}`, 'Academic Year', academicYear]
  ];

  infoData.forEach(row => {
    doc.rect(30, y, 270, 20).stroke('#ddd');
    doc.rect(300, y, 270, 20).stroke('#ddd');
    doc.fontSize(8).fillColor('#555').text(row[0] + ':', 35, y + 5, { width: 100 });
    doc.fillColor('#000').font('Helvetica-Bold').text(row[1], 140, y + 5, { width: 155 });
    doc.fillColor('#555').font('Helvetica').text(row[2] + ':', 305, y + 5, { width: 100 });
    doc.fillColor('#000').font('Helvetica-Bold').text(row[3], 410, y + 5, { width: 155 });
    y += 20;
  });

  y += 20;

  // Fee details header
  doc.rect(30, y, doc.page.width - 60, 20).fill('#f0f4ff').stroke('#1a56db');
  doc.fontSize(9).fillColor('#1a56db').font('Helvetica-Bold')
    .text('Fee Details', 40, y + 5);
  y += 20;

  // Fee rows
  const feeRows = [
    ['Fee Type', feeLabel || 'Tuition Fee'],
    ['Total Amount', `₹ ${totalAmount.toLocaleString('en-IN')}`],
    ['Amount Paid', `₹ ${paidAmount.toLocaleString('en-IN')}`],
    ['Balance Due', `₹ ${dueAmount.toLocaleString('en-IN')}`],
    ['Payment Mode', paymentMode?.replace('_', ' ').toUpperCase()],
    ...(transactionId ? [['Transaction ID', transactionId]] : [])
  ];

  feeRows.forEach(([label, value], i) => {
    const rowBg = i % 2 === 0 ? '#fafafa' : '#ffffff';
    doc.rect(30, y, doc.page.width - 60, 22).fill(rowBg).stroke('#ddd');
    doc.fontSize(9).fillColor('#555').font('Helvetica').text(label, 40, y + 6, { width: 200 });
    doc.fillColor('#000').font('Helvetica-Bold').text(value, 250, y + 6, { width: 300 });
    y += 22;
  });

  y += 30;

  // Amount in words
  doc.fontSize(9).fillColor('#333').font('Helvetica')
    .text(`Amount in Words: ${numberToWords(paidAmount)} Only`, 40, y);

  y += 40;

  // Signature lines
  doc.moveTo(40, y + 30).lineTo(200, y + 30).stroke('#999');
  doc.moveTo(380, y + 30).lineTo(560, y + 30).stroke('#999');
  doc.fontSize(8).fillColor('#555')
    .text("Payer's Signature", 70, y + 35)
    .text("Authorized Signatory", 400, y + 35);

  // Footer
  doc.fontSize(7).fillColor('#999')
    .text('This is a computer-generated receipt. No signature required.', 40, doc.page.height - 50, { align: 'center', width: doc.page.width - 80 });

  doc.end();
  return bufferPromise;
};

// ─── Report Card ───────────────────────────────────────────────────────────────
const generateReportCard = async ({ school, result, exam, gradingSystem }) => {
  const doc = createDoc();
  const bufferPromise = bufferFromDoc(doc);

  let y = drawSchoolHeader(doc, school, `REPORT CARD - ${exam.name?.toUpperCase()}`);
  y += 10;

  // Student Info
  const studentInfo = [
    ['Student Name', result.studentName, 'Roll No', result.rollNumber || '-'],
    ['Class', `${result.className}${result.section ? ` - ${result.section}` : ''}`, 'Academic Year', result.academicYear],
    ['Exam Type', exam.examType?.replace('_', ' ').toUpperCase(), 'Result', result.result?.toUpperCase()]
  ];

  studentInfo.forEach(row => {
    doc.rect(30, y, 270, 22).stroke('#ddd');
    doc.rect(300, y, 270, 22).stroke('#ddd');
    doc.fontSize(8).fillColor('#666').font('Helvetica').text(row[0] + ':', 36, y + 6, { width: 95 });
    doc.fillColor('#000').font('Helvetica-Bold').text(row[1], 136, y + 6, { width: 160 });
    doc.fillColor('#666').font('Helvetica').text(row[2] + ':', 306, y + 6, { width: 95 });
    doc.fillColor('#000').font('Helvetica-Bold').text(row[3], 406, y + 6, { width: 160 });
    y += 22;
  });

  y += 15;

  // Marks table header
  const colWidths = [180, 80, 80, 80, 80, 80];
  const headers = ['Subject', 'Max Marks', 'Obtained', 'Pass Marks', 'Grade', 'Status'];
  const headerColors = ['#1a56db', '#1a56db', '#1a56db', '#1a56db', '#1a56db', '#1a56db'];
  let x = 30;

  headers.forEach((h, i) => {
    doc.rect(x, y, colWidths[i], 22).fill(headerColors[i]).stroke('#1a56db');
    doc.fontSize(8).fillColor('#fff').font('Helvetica-Bold')
      .text(h, x + 4, y + 6, { width: colWidths[i] - 8, align: 'center' });
    x += colWidths[i];
  });
  y += 22;

  // Marks rows
  result.marks.forEach((m, idx) => {
    x = 30;
    const rowBg = idx % 2 === 0 ? '#f9fafb' : '#ffffff';
    const values = [
      m.subjectName,
      m.maxMarks.toString(),
      m.isAbsent ? 'AB' : (m.marksObtained?.toString() || '-'),
      m.passMarks.toString(),
      m.grade || '-',
      m.isAbsent ? 'Absent' : (m.marksObtained >= m.passMarks ? 'PASS' : 'FAIL')
    ];

    const statusColor = values[5] === 'PASS' ? '#16a34a' : (values[5] === 'FAIL' ? '#dc2626' : '#555');

    values.forEach((v, i) => {
      doc.rect(x, y, colWidths[i], 20).fill(rowBg).stroke('#ddd');
      const isStatus = i === 5;
      doc.fontSize(8)
        .fillColor(isStatus ? statusColor : '#000')
        .font(isStatus ? 'Helvetica-Bold' : 'Helvetica')
        .text(v, x + 4, y + 5, { width: colWidths[i] - 8, align: i === 0 ? 'left' : 'center' });
      x += colWidths[i];
    });
    y += 20;
  });

  y += 15;

  // Summary row
  doc.rect(30, y, 580, 28).fill('#e8f0fe').stroke('#1a56db');
  doc.fontSize(9).font('Helvetica-Bold').fillColor('#1a56db');
  doc.text(`Total: ${result.totalMarks} / ${result.totalMaxMarks}`, 36, y + 8);
  doc.text(`Percentage: ${result.obtainedPercentage}%`, 200, y + 8);
  doc.text(`Grade: ${result.grade || '-'}`, 350, y + 8);
  doc.text(`Rank: ${result.rank || '-'}`, 460, y + 8);
  y += 40;

  // Grading scale
  if (y < doc.page.height - 180) {
    doc.fontSize(9).font('Helvetica-Bold').fillColor('#333').text('Grading Scale:', 30, y);
    y += 15;
    const gradeX = 30;
    let gX = gradeX;
    gradingSystem?.forEach(g => {
      doc.rect(gX, y, 85, 18).fill('#f3f4f6').stroke('#ddd');
      doc.fontSize(7).font('Helvetica').fillColor('#555')
        .text(`${g.grade}: ${g.minPercentage}-${g.maxPercentage}%`, gX + 3, y + 4, { width: 79, align: 'center' });
      gX += 85;
      if (gX > 500) { gX = gradeX; y += 18; }
    });
    y += 30;
  }

  // Signatures
  y = Math.max(y, doc.page.height - 120);
  doc.moveTo(40, y + 30).lineTo(160, y + 30).stroke('#999');
  doc.moveTo(220, y + 30).lineTo(360, y + 30).stroke('#999');
  doc.moveTo(420, y + 30).lineTo(560, y + 30).stroke('#999');
  doc.fontSize(8).fillColor('#555')
    .text("Class Teacher", 55, y + 35)
    .text("Principal", 270, y + 35)
    .text("Parent / Guardian", 435, y + 35);

  doc.end();
  return bufferPromise;
};

// ─── Attendance Sheet PDF ──────────────────────────────────────────────────────
const generateAttendanceSheet = async ({ school, className, section, month, students, workingDays, dates }) => {
  const doc = createDoc({ size: 'A3', layout: 'landscape' });
  const bufferPromise = bufferFromDoc(doc);

  doc.fontSize(14).font('Helvetica-Bold').fillColor('#1a56db')
    .text(`${school.name} - Attendance Sheet`, { align: 'center' });
  doc.fontSize(10).fillColor('#333')
    .text(`Class: ${className}${section ? ` - ${section}` : ''} | Month: ${month}`, { align: 'center' });
  doc.moveDown();

  // Table headers: Name, Adm No, then date columns, Total P, Total A, %
  // (simplified due to dynamic date count)
  students.forEach((s, idx) => {
    doc.fontSize(8).text(
      `${idx + 1}. ${s.student.firstName} ${s.student.lastName || ''} | P:${s.present} | A:${s.absent} | L:${s.leave} | ${s.percentage}%`
    );
  });

  doc.end();
  return bufferPromise;
};

// ─── Number to words (simple) ──────────────────────────────────────────────────
const numberToWords = (num) => {
  if (num === 0) return 'Zero';
  const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine',
    'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
  const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

  const convert = (n) => {
    if (n < 20) return ones[n];
    if (n < 100) return tens[Math.floor(n / 10)] + (n % 10 ? ' ' + ones[n % 10] : '');
    if (n < 1000) return ones[Math.floor(n / 100)] + ' Hundred' + (n % 100 ? ' ' + convert(n % 100) : '');
    if (n < 100000) return convert(Math.floor(n / 1000)) + ' Thousand' + (n % 1000 ? ' ' + convert(n % 1000) : '');
    if (n < 10000000) return convert(Math.floor(n / 100000)) + ' Lakh' + (n % 100000 ? ' ' + convert(n % 100000) : '');
    return convert(Math.floor(n / 10000000)) + ' Crore' + (n % 10000000 ? ' ' + convert(n % 10000000) : '');
  };

  return 'Rupees ' + convert(Math.floor(num)) + (num % 1 ? ' and Paise ' + Math.round((num % 1) * 100) : '');
};

// ─── Student ID Card ───────────────────────────────────────────────────────────
// Each card: 85.6mm × 54mm (CR80 standard) — we fit 4 cards per A4 landscape page
// Layout: left photo + QR, right name/details
const generateStudentIDCards = async ({ school, students }) => {
  const https = require('https');
  const http  = require('http');

  // Helper: fetch image URL → Buffer
  const fetchImage = (url) => new Promise((resolve) => {
    if (!url) return resolve(null);
    try {
      const proto = url.startsWith('https') ? https : http;
      proto.get(url, (res) => {
        const chunks = [];
        res.on('data', c => chunks.push(c));
        res.on('end', () => resolve(Buffer.concat(chunks)));
        res.on('error', () => resolve(null));
      }).on('error', () => resolve(null));
    } catch { resolve(null); }
  });

  // Simple QR code as SVG-like pattern using pdfkit rectangles (no external lib)
  // We encode student ID in a basic visual indicator block
  const drawQRPlaceholder = (doc, x, y, size, text) => {
    const cell = size / 12;
    doc.rect(x, y, size, size).lineWidth(0.5).stroke('#333');
    // finder pattern top-left
    doc.rect(x + cell, y + cell, cell * 3, cell * 3).fill('#333');
    doc.rect(x + cell + 0.5, y + cell + 0.5, cell * 3 - 1, cell * 3 - 1).fill('#fff');
    doc.rect(x + cell * 1.5, y + cell * 1.5, cell * 2, cell * 2).fill('#333');
    // finder pattern top-right
    doc.rect(x + cell * 8, y + cell, cell * 3, cell * 3).fill('#333');
    doc.rect(x + cell * 8 + 0.5, y + cell + 0.5, cell * 3 - 1, cell * 3 - 1).fill('#fff');
    doc.rect(x + cell * 8.5, y + cell * 1.5, cell * 2, cell * 2).fill('#333');
    // finder pattern bottom-left
    doc.rect(x + cell, y + cell * 8, cell * 3, cell * 3).fill('#333');
    doc.rect(x + cell + 0.5, y + cell * 8 + 0.5, cell * 3 - 1, cell * 3 - 1).fill('#fff');
    doc.rect(x + cell * 1.5, y + cell * 8.5, cell * 2, cell * 2).fill('#333');
    // random-looking data dots from student text hash
    let hash = 0;
    for (let i = 0; i < text.length; i++) hash = (hash * 31 + text.charCodeAt(i)) & 0xffffffff;
    for (let r = 4; r < 12; r++) {
      for (let c = 4; c < 12; c++) {
        if ((hash >> ((r * 12 + c) % 32)) & 1) {
          doc.rect(x + c * cell, y + r * cell, cell - 0.5, cell - 0.5).fill('#333');
        }
      }
    }
    // ID text below QR
    doc.fontSize(4).fillColor('#333').font('Helvetica')
      .text(text, x, y + size + 1, { width: size, align: 'center' });
  };

  // Card dimensions in points (72 pt = 1 inch; 85.6mm ≈ 242pt, 54mm ≈ 153pt)
  const CARD_W = 242;
  const CARD_H = 153;
  const MARGIN = 20;   // page margin
  const GAP    = 12;   // gap between cards
  const COLS   = 2;
  const ROWS   = 3;

  const doc = new PDFDocument({ size: 'A4', margin: MARGIN, layout: 'portrait',
    info: { Title: 'Student ID Cards', Author: 'Rural School ERP' } });
  const bufferPromise = bufferFromDoc(doc);

  // Fetch school logo once
  const logoBuffer = await fetchImage(school?.logo?.url);

  let cardIndex = 0;

  for (const student of students) {
    const col = cardIndex % COLS;
    const row = Math.floor(cardIndex / COLS) % ROWS;

    if (cardIndex > 0 && cardIndex % (COLS * ROWS) === 0) {
      doc.addPage();
    }

    const cx = MARGIN + col * (CARD_W + GAP);
    const cy = MARGIN + row * (CARD_H + GAP);

    // ── Card background ──
    doc.roundedRect(cx, cy, CARD_W, CARD_H, 6)
      .fillAndStroke('#ffffff', '#1a56db');

    // ── Header bar ──
    doc.save();
    doc.roundedRect(cx, cy, CARD_W, 28, 6).clip();
    doc.rect(cx, cy, CARD_W, 28).fill('#1a56db');
    doc.restore();

    // School logo in header
    if (logoBuffer) {
      try {
        doc.image(logoBuffer, cx + 5, cy + 4, { height: 20, width: 20 });
      } catch (_) { /* skip */ }
    }

    // School name in header
    const schoolName = school?.name || 'School Name';
    doc.fontSize(7).fillColor('#ffffff').font('Helvetica-Bold')
      .text(schoolName, cx + 28, cy + 6, { width: CARD_W - 36, align: 'center' });
    doc.fontSize(5).font('Helvetica').fillColor('#d0e8ff')
      .text('STUDENT IDENTITY CARD', cx + 28, cy + 17, { width: CARD_W - 36, align: 'center' });

    // ── Photo area ──
    const photoX = cx + 8;
    const photoY = cy + 34;
    const photoW = 50;
    const photoH = 62;

    doc.rect(photoX, photoY, photoW, photoH).lineWidth(1).stroke('#1a56db');

    const photoBuffer = await fetchImage(student.photo?.url);
    if (photoBuffer) {
      try {
        doc.image(photoBuffer, photoX + 1, photoY + 1, { width: photoW - 2, height: photoH - 2, cover: [photoW - 2, photoH - 2] });
      } catch (_) {
        doc.fontSize(18).fillColor('#ccc').text('👤', photoX + 12, photoY + 18);
      }
    } else {
      doc.rect(photoX + 1, photoY + 1, photoW - 2, photoH - 2).fill('#f0f4ff');
      doc.fontSize(18).fillColor('#a0aec0').font('Helvetica').text('👤', photoX + 14, photoY + 16);
    }

    // Blood group badge on photo
    if (student.bloodGroup && student.bloodGroup !== 'Unknown') {
      doc.rect(photoX, photoY + photoH - 14, photoW, 14).fill('#dc2626');
      doc.fontSize(6.5).fillColor('#fff').font('Helvetica-Bold')
        .text(`🩸 ${student.bloodGroup}`, photoX, photoY + photoH - 10, { width: photoW, align: 'center' });
    }

    // ── Details area ──
    const detX = cx + 64;
    const detW = CARD_W - 70;
    let detY = cy + 34;

    const fullName = `${student.firstName} ${student.lastName || ''}`.trim();
    doc.fontSize(8.5).fillColor('#1a56db').font('Helvetica-Bold')
      .text(fullName, detX, detY, { width: detW });
    detY += 13;

    const detailRows = [
      ['ID',    student.admissionNumber || '-'],
      ['Class', `${student.className || '-'}${student.section ? ' ' + student.section : ''}`],
      ['Roll',  student.rollNumber || '-'],
      ['Year',  student.academicYear || '-'],
    ];

    detailRows.forEach(([label, value]) => {
      doc.fontSize(5.5).fillColor('#666').font('Helvetica')
        .text(label + ':', detX, detY, { width: 24, continued: false });
      doc.fontSize(5.5).fillColor('#111').font('Helvetica-Bold')
        .text(value, detX + 26, detY, { width: detW - 26 });
      detY += 9;
    });

    // QR code area
    const qrSize = 34;
    const qrX = cx + CARD_W - qrSize - 6;
    const qrY = cy + 34;
    drawQRPlaceholder(doc, qrX, qrY, qrSize, student.admissionNumber || student._id?.toString() || 'ID');

    // ── Footer bar ──
    const footY = cy + CARD_H - 18;
    doc.rect(cx, footY, CARD_W, 18).fillAndStroke('#f0f4ff', '#1a56db');
    const contactLine = [school?.phone, school?.email].filter(Boolean).join(' | ');
    doc.fontSize(5).fillColor('#1a56db').font('Helvetica')
      .text(contactLine || 'School Contact', cx + 4, footY + 6, { width: CARD_W - 8, align: 'center' });

    cardIndex++;
  }

  doc.end();
  return bufferPromise;
};

module.exports = {
  generateFeeReceipt,
  generateReportCard,
  generateAttendanceSheet,
  generateStudentIDCards
};
