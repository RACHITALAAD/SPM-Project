import './config/env.js';
import fs from 'fs/promises';
import path from 'path';
import bcrypt from 'bcryptjs';
import mongoose from 'mongoose';
import { connectDB } from './config/db.js';
import { UPLOADS_DIR } from './config/paths.js';
import Assignment from './models/Assignment.js';
import Evaluation from './models/Evaluation.js';
import Submission from './models/Submission.js';
import User from './models/User.js';

const FACULTY_EMAIL = 'faculty@iiitv.edu.in';
const FACULTY_PASSWORD = 'Faculty@123';
const STUDENT_PASSWORD = 'Student@123';

function daysFromNow(days) {
  return new Date(Date.now() + days * 24 * 60 * 60 * 1000);
}

function minimalPdf(title) {
  const safeTitle = title.replace(/[()\\]/g, '').slice(0, 80);
  const stream = `BT /F1 18 Tf 48 140 Td (${safeTitle}) Tj ET`;
  const objects = [
    '1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj\n',
    '2 0 obj << /Type /Pages /Kids [3 0 R] /Count 1 >> endobj\n',
    '3 0 obj << /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >> endobj\n',
    `4 0 obj << /Length ${Buffer.byteLength(stream)} >> stream\n${stream}\nendstream endobj\n`,
    '5 0 obj << /Type /Font /Subtype /Type1 /BaseFont /Helvetica >> endobj\n',
  ];

  let body = '%PDF-1.4\n';
  const offsets = [0];
  for (const object of objects) {
    offsets.push(Buffer.byteLength(body));
    body += object;
  }
  const xrefAt = Buffer.byteLength(body);
  let xref = `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  for (let index = 1; index < offsets.length; index += 1) {
    xref += `${String(offsets[index]).padStart(10, '0')} 00000 n \n`;
  }
  body += xref;
  body += `trailer << /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefAt}\n%%EOF`;
  return Buffer.from(body, 'utf8');
}

async function clearUploads() {
  await fs.mkdir(UPLOADS_DIR, { recursive: true });
  const files = await fs.readdir(UPLOADS_DIR);
  await Promise.all(
    files.filter((name) => name !== '.gitkeep').map((name) => fs.unlink(path.join(UPLOADS_DIR, name))),
  );
}

async function writeSeedFile(storedName, title) {
  await fs.writeFile(path.join(UPLOADS_DIR, storedName), minimalPdf(title));
  const stat = await fs.stat(path.join(UPLOADS_DIR, storedName));
  return stat.size;
}

async function seed() {
  const reset = process.argv.includes('--reset');
  await connectDB();

  const existing = await User.countDocuments();
  if (existing && !reset) {
    console.log('Database already has users. Run npm run seed:reset to load the demo again.');
    await mongoose.disconnect();
    return;
  }

  if (reset) {
    await Promise.all([
      Evaluation.deleteMany({}),
      Submission.deleteMany({}),
      Assignment.deleteMany({}),
      User.deleteMany({}),
    ]);
    await clearUploads();
  }

  const facultyPassword = await bcrypt.hash(FACULTY_PASSWORD, 10);
  const studentPassword = await bcrypt.hash(STUDENT_PASSWORD, 10);

  const faculty = await User.create({
    name: 'Prof. Ananya Iyer',
    email: FACULTY_EMAIL,
    password: facultyPassword,
    role: 'faculty',
    department: 'Computer Science and Engineering',
  });

  const [aarav, diya] = await User.create([
    {
      name: 'Aarav Mehta',
      email: 'student.aarav@iiitv.edu.in',
      password: studentPassword,
      role: 'student',
      rollNumber: '202351201',
      department: 'Computer Science and Engineering',
    },
    {
      name: 'Diya Patel',
      email: 'student.diya@iiitv.edu.in',
      password: studentPassword,
      role: 'student',
      rollNumber: '202351214',
      department: 'Computer Science and Engineering',
    },
    {
      name: 'Kabir Shah',
      email: 'student.kabir@iiitv.edu.in',
      password: studentPassword,
      role: 'student',
      rollNumber: '202351227',
      department: 'Computer Science and Engineering',
    },
  ]);

  const [operatingSystems, databaseSystems] = await Assignment.create([
    {
      title: 'Process scheduling comparison',
      courseCode: 'CS301',
      courseName: 'Operating Systems',
      description:
        'Compare FCFS, SJF, and Round Robin on the supplied process mix. Submit a PDF report with waiting-time calculations and a short recommendation for a mixed interactive workload.',
      deadline: daysFromNow(6),
      maxMarks: 20,
      status: 'published',
      createdBy: faculty._id,
    },
    {
      title: 'Normalization case study',
      courseCode: 'CS304',
      courseName: 'Database Systems',
      description:
        'Normalize the library-issue schema to 3NF. Submit a PDF or DOCX that shows each functional dependency, the decomposition, and whether any dependency was lost.',
      deadline: daysFromNow(-2),
      maxMarks: 25,
      status: 'published',
      createdBy: faculty._id,
    },
    {
      title: 'Risk register for the assignment platform',
      courseCode: 'CS401',
      courseName: 'Software Project Management',
      description:
        'Draft a risk register for this project covering schedule, scope, and deployment risks. Keep this assignment in draft until the rubric is finalized.',
      deadline: daysFromNow(12),
      maxMarks: 15,
      status: 'draft',
      createdBy: faculty._id,
    },
  ]);

  const aaravOsSize = await writeSeedFile('seed-aarav-os.pdf', 'Process scheduling comparison');
  const aaravDbSize = await writeSeedFile('seed-aarav-dbms.pdf', 'Normalization case study - Aarav');
  const diyaDbSize = await writeSeedFile('seed-diya-dbms.pdf', 'Normalization case study - Diya');

  const aaravOs = await Submission.create({
    assignment: operatingSystems._id,
    student: aarav._id,
    originalName: 'aarav-process-scheduling.pdf',
    storedName: 'seed-aarav-os.pdf',
    mimeType: 'application/pdf',
    size: aaravOsSize,
    submittedAt: new Date(Date.now() - 5 * 60 * 60 * 1000),
  });
  const aaravDb = await Submission.create({
    assignment: databaseSystems._id,
    student: aarav._id,
    originalName: 'aarav-normalization.pdf',
    storedName: 'seed-aarav-dbms.pdf',
    mimeType: 'application/pdf',
    size: aaravDbSize,
    submittedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
  });
  await Submission.create({
    assignment: databaseSystems._id,
    student: diya._id,
    originalName: 'diya-normalization.pdf',
    storedName: 'seed-diya-dbms.pdf',
    mimeType: 'application/pdf',
    size: diyaDbSize,
    submittedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
  });

  await Evaluation.create({
    submission: aaravDb._id,
    faculty: faculty._id,
    marks: 21,
    feedback:
      'Decomposition reaches 3NF and the dependency list is clear. The transitive dependency on issue_date is mentioned but not fully removed in the final schema. Revise that step.',
    evaluatedAt: new Date(Date.now() - 24 * 60 * 60 * 1000),
  });

  console.log(`
Seed complete. Kabir Shah has no submission yet, so the student dashboard still has open work.
Aarav's operating-systems file (${aaravOs.originalName}) is waiting for evaluation.

Faculty
  ${FACULTY_EMAIL}
  ${FACULTY_PASSWORD}

Students
  student.aarav@iiitv.edu.in   ${STUDENT_PASSWORD}
  student.diya@iiitv.edu.in    ${STUDENT_PASSWORD}
  student.kabir@iiitv.edu.in   ${STUDENT_PASSWORD}
`);

  await mongoose.disconnect();
}

seed().catch(async (error) => {
  console.error('Seed failed.');
  console.error(error.message);
  console.error('Start MongoDB with: docker compose up -d');
  await mongoose.disconnect().catch(() => {});
  process.exit(1);
});
