import fs from 'fs/promises';
import path from 'path';
import { Readable } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import { Router } from 'express';
import { UPLOADS_DIR } from '../config/paths.js';
import { getCloudinaryDownloadUrl } from '../config/cloudinary.js';
import { requireAuth, requireRole } from '../middleware/auth.js';
import Assignment from '../models/Assignment.js';
import Evaluation from '../models/Evaluation.js';
import Submission from '../models/Submission.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { HttpError } from '../utils/httpError.js';
import { evaluationJson } from '../utils/serialize.js';

const router = Router();

async function loadSubmission(id) {
  const submission = await Submission.findById(id)
    .populate('student', 'name email rollNumber role')
    .populate('assignment');
  if (!submission || !submission.assignment) throw new HttpError(404, 'Submission not found');
  return submission;
}

function canRead(user, submission) {
  if (user.role === 'student') return submission.student._id.equals(user._id);
  return submission.assignment.createdBy.equals(user._id);
}

router.get(
  '/mine',
  requireAuth,
  requireRole('student'),
  asyncHandler(async (req, res) => {
    const submissions = await Submission.find({ student: req.user._id })
      .populate('assignment', 'title courseCode courseName maxMarks deadline status')
      .sort({ submittedAt: -1 })
      .lean();
    const evaluations = await Evaluation.find({
      submission: { $in: submissions.map((item) => item._id) },
    }).lean();
    const evaluationBySubmission = new Map(evaluations.map((item) => [String(item.submission), item]));

    res.json(
      submissions
        .filter((item) => item.assignment && item.assignment.status === 'published')
        .map((item) => ({
          id: item._id,
          originalName: item.originalName,
          size: item.size,
          submittedAt: item.submittedAt,
          assignment: {
            id: item.assignment._id,
            title: item.assignment.title,
            courseCode: item.assignment.courseCode,
            courseName: item.assignment.courseName,
            maxMarks: item.assignment.maxMarks,
            deadline: item.assignment.deadline,
          },
          evaluation: evaluationJson(evaluationBySubmission.get(String(item._id))),
        })),
    );
  }),
);

router.get(
  '/assignment/:assignmentId',
  requireAuth,
  requireRole('faculty'),
  asyncHandler(async (req, res) => {
    const assignment = await Assignment.findById(req.params.assignmentId);
    if (!assignment) throw new HttpError(404, 'Assignment not found');
    if (!assignment.createdBy.equals(req.user._id)) {
      throw new HttpError(403, 'You can only review submissions for your own assignments');
    }

    const submissions = await Submission.find({ assignment: assignment._id })
      .populate('student', 'name email rollNumber')
      .sort({ submittedAt: 1 })
      .lean();
    const evaluations = await Evaluation.find({
      submission: { $in: submissions.map((item) => item._id) },
    }).lean();
    const evaluationBySubmission = new Map(evaluations.map((item) => [String(item.submission), item]));

    res.json({
      assignment: {
        id: assignment._id,
        title: assignment.title,
        courseCode: assignment.courseCode,
        courseName: assignment.courseName,
        deadline: assignment.deadline,
        maxMarks: assignment.maxMarks,
        status: assignment.status,
      },
      submissions: submissions.map((item) => ({
        id: item._id,
        originalName: item.originalName,
        size: item.size,
        submittedAt: item.submittedAt,
        student: {
          id: item.student?._id,
          name: item.student?.name || 'Unknown student',
          email: item.student?.email || '',
          rollNumber: item.student?.rollNumber || '',
        },
        evaluation: evaluationJson(evaluationBySubmission.get(String(item._id))),
      })),
    });
  }),
);

router.get(
  '/:id',
  requireAuth,
  asyncHandler(async (req, res) => {
    const submission = await loadSubmission(req.params.id);
    if (!canRead(req.user, submission)) throw new HttpError(403, 'You cannot open this submission');
    const evaluation = await Evaluation.findOne({ submission: submission._id }).lean();
    res.json({
      id: submission._id,
      originalName: submission.originalName,
      size: submission.size,
      mimeType: submission.mimeType,
      submittedAt: submission.submittedAt,
      student: {
        id: submission.student._id,
        name: submission.student.name,
        email: submission.student.email,
        rollNumber: submission.student.rollNumber || '',
      },
      assignment: {
        id: submission.assignment._id,
        title: submission.assignment.title,
        courseCode: submission.assignment.courseCode,
        courseName: submission.assignment.courseName,
        maxMarks: submission.assignment.maxMarks,
        deadline: submission.assignment.deadline,
      },
      evaluation: evaluationJson(evaluation),
    });
  }),
);

router.get(
  '/:id/file',
  requireAuth,
  asyncHandler(async (req, res) => {
    const submission = await loadSubmission(req.params.id);
    if (!canRead(req.user, submission)) throw new HttpError(403, 'You cannot download this file');

    if (submission.cloudinaryPublicId) {
      const downloadUrl = getCloudinaryDownloadUrl(
        submission.cloudinaryPublicId,
        submission.cloudinaryFormat || path.extname(submission.originalName).slice(1).toLowerCase(),
      );

      let cloudinaryResponse;
      try {
        cloudinaryResponse = await fetch(downloadUrl, {
          signal: AbortSignal.timeout(30_000),
        });
      } catch (error) {
        console.error('Cloudinary download request failed:', error.message);
        throw new HttpError(502, 'Could not retrieve the uploaded file. Please try again.');
      }

      if (!cloudinaryResponse.ok || !cloudinaryResponse.body) {
        throw new HttpError(502, 'Could not retrieve the uploaded file from cloud storage.');
      }

      res.attachment(submission.originalName);
      res.type(submission.mimeType || 'application/octet-stream');
      if (submission.size) res.setHeader('Content-Length', String(submission.size));
      await pipeline(Readable.fromWeb(cloudinaryResponse.body), res);
      return;
    }

    // Older local submissions and the local development mode continue to use server/uploads.
    const filePath = path.resolve(UPLOADS_DIR, submission.storedName);
    if (!filePath.startsWith(`${UPLOADS_DIR}${path.sep}`)) {
      throw new HttpError(400, 'Invalid file');
    }
    try {
      await fs.access(filePath);
    } catch {
      throw new HttpError(404, 'The uploaded file is no longer on the server');
    }
    res.download(filePath, submission.originalName);
  }),
);

router.post(
  '/:id/evaluate',
  requireAuth,
  requireRole('faculty'),
  asyncHandler(async (req, res) => {
    const submission = await loadSubmission(req.params.id);
    if (!submission.assignment.createdBy.equals(req.user._id)) {
      throw new HttpError(403, 'You can only evaluate submissions for your own assignments');
    }

    if (req.body.marks === '' || req.body.marks === null || req.body.marks === undefined) {
      throw new HttpError(400, 'Enter marks before saving the evaluation');
    }
    const marks = Number(req.body.marks);
    const feedback = String(req.body.feedback ?? '').trim();
    if (!Number.isInteger(marks) || marks < 0 || marks > submission.assignment.maxMarks) {
      throw new HttpError(400, `Marks must be a whole number from 0 to ${submission.assignment.maxMarks}`);
    }
    if (feedback.length < 5 || feedback.length > 2000) {
      throw new HttpError(400, 'Feedback should be between 5 and 2000 characters');
    }

    const evaluation = await Evaluation.findOneAndUpdate(
      { submission: submission._id },
      {
        submission: submission._id,
        faculty: req.user._id,
        marks,
        feedback,
        evaluatedAt: new Date(),
      },
      { upsert: true, new: true, setDefaultsOnInsert: true },
    );

    res.json({
      id: submission._id,
      evaluation: evaluationJson(evaluation),
    });
  }),
);

export default router;
