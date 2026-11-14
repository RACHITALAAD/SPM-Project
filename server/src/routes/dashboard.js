import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import Assignment from '../models/Assignment.js';
import Evaluation from '../models/Evaluation.js';
import Submission from '../models/Submission.js';
import User from '../models/User.js';
import { asyncHandler } from '../utils/asyncHandler.js';

const router = Router();

router.get(
  '/',
  requireAuth,
  asyncHandler(async (req, res) => {
    if (req.user.role === 'faculty') {
      res.json(await facultyDashboard(req.user));
      return;
    }
    res.json(await studentDashboard(req.user));
  }),
);

async function facultyDashboard(user) {
  const assignments = await Assignment.find({ createdBy: user._id }).sort({ updatedAt: -1 }).lean();
  const ids = assignments.map((item) => item._id);
  const submissions = await Submission.find({ assignment: { $in: ids } }).lean();
  const evaluations = await Evaluation.find({
    submission: { $in: submissions.map((item) => item._id) },
  }).lean();
  const evaluatedIds = new Set(evaluations.map((item) => String(item.submission)));
  const studentCount = await User.countDocuments({ role: 'student' });

  const counts = new Map();
  for (const submission of submissions) {
    const key = String(submission.assignment);
    const current = counts.get(key) || { submissionCount: 0, evaluatedCount: 0 };
    current.submissionCount += 1;
    if (evaluatedIds.has(String(submission._id))) current.evaluatedCount += 1;
    counts.set(key, current);
  }

  const pending = await Submission.find({
    assignment: { $in: ids },
    _id: { $nin: evaluations.map((item) => item.submission) },
  })
    .sort({ submittedAt: -1 })
    .limit(6)
    .populate('student', 'name rollNumber')
    .populate('assignment', 'title courseCode')
    .lean();

  const published = assignments.filter((item) => item.status === 'published').length;

  return {
    role: 'faculty',
    stats: {
      assignments: assignments.length,
      published,
      drafts: assignments.length - published,
      submissions: submissions.length,
      pending: submissions.length - evaluations.length,
      evaluated: evaluations.length,
      students: studentCount,
    },
    assignments: assignments.map((item) => ({
      id: item._id,
      title: item.title,
      courseCode: item.courseCode,
      deadline: item.deadline,
      status: item.status,
      maxMarks: item.maxMarks,
      studentCount,
      ...(counts.get(String(item._id)) || { submissionCount: 0, evaluatedCount: 0 }),
    })),
    pending: pending.map((item) => ({
      submissionId: item._id,
      assignmentId: item.assignment?._id,
      assignmentTitle: item.assignment?.title || 'Assignment',
      courseCode: item.assignment?.courseCode || '',
      studentName: item.student?.name || 'Unknown student',
      rollNumber: item.student?.rollNumber || '',
      submittedAt: item.submittedAt,
    })),
  };
}

async function studentDashboard(user) {
  const assignments = await Assignment.find({ status: 'published' }).sort({ deadline: 1 }).lean();
  const submissions = await Submission.find({ student: user._id }).lean();
  const submissionByAssignment = new Map(submissions.map((item) => [String(item.assignment), item]));
  const evaluations = await Evaluation.find({
    submission: { $in: submissions.map((item) => item._id) },
  }).lean();
  const evaluationBySubmission = new Map(evaluations.map((item) => [String(item.submission), item]));
  const now = Date.now();

  const upcoming = assignments
    .filter((item) => new Date(item.deadline).getTime() > now && !submissionByAssignment.has(String(item._id)))
    .slice(0, 4)
    .map((item) => ({
      id: item._id,
      title: item.title,
      courseCode: item.courseCode,
      courseName: item.courseName,
      deadline: item.deadline,
      maxMarks: item.maxMarks,
    }));

  const results = [];
  for (const assignment of assignments) {
    const submission = submissionByAssignment.get(String(assignment._id));
    if (!submission) continue;
    const evaluation = evaluationBySubmission.get(String(submission._id));
    if (!evaluation) continue;
    results.push({
      submissionId: submission._id,
      assignmentId: assignment._id,
      title: assignment.title,
      courseCode: assignment.courseCode,
      maxMarks: assignment.maxMarks,
      marks: evaluation.marks,
      feedback: evaluation.feedback,
      evaluatedAt: evaluation.evaluatedAt,
    });
  }
  results.sort((a, b) => new Date(b.evaluatedAt) - new Date(a.evaluatedAt));

  const submitted = assignments.filter((item) => submissionByAssignment.has(String(item._id))).length;
  const averagePercent = results.length
    ? Math.round(results.reduce((sum, item) => sum + (item.marks / item.maxMarks) * 100, 0) / results.length)
    : null;

  return {
    role: 'student',
    stats: {
      assigned: assignments.length,
      submitted,
      pendingSubmission: assignments.length - submitted,
      evaluated: results.length,
      averagePercent,
    },
    upcoming,
    results: results.slice(0, 3),
  };
}

export default router;
