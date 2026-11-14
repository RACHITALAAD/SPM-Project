import fs from 'fs/promises';
import path from 'path';
import { Router } from 'express';
import { UPLOADS_DIR } from '../config/paths.js';
import { uploadToCloudinary, deleteFromCloudinary } from '../config/cloudinary.js';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { upload } from '../middleware/upload.js';
import Assignment from '../models/Assignment.js';
import Evaluation from '../models/Evaluation.js';
import Submission from '../models/Submission.js';
import { parseAssignment } from '../utils/assignmentInput.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { HttpError } from '../utils/httpError.js';
import { assignmentJson, submissionJson } from '../utils/serialize.js';

const router = Router();

async function removeLocalFile(storedName) {
  if (!storedName) return;
  const filePath = path.resolve(UPLOADS_DIR, storedName);
  if (!filePath.startsWith(`${UPLOADS_DIR}${path.sep}`)) return;
  await fs.unlink(filePath).catch(() => {});
}

async function safelyDeleteCloudinaryFile(publicId) {
  if (!publicId) return;
  try {
    await deleteFromCloudinary(publicId);
  } catch (error) {
    console.error('Could not remove the replaced Cloudinary file:', error.message);
  }
}

async function ownAssignment(id, user) {
  const assignment = await Assignment.findById(id);
  if (!assignment) throw new HttpError(404, 'Assignment not found');
  if (!assignment.createdBy.equals(user._id)) {
    throw new HttpError(403, 'You can only manage your own assignments');
  }
  return assignment;
}

async function submissionMapFor(studentId, assignmentIds) {
  const submissions = await Submission.find({
    student: studentId,
    assignment: { $in: assignmentIds },
  }).lean();
  const evaluations = await Evaluation.find({
    submission: { $in: submissions.map((item) => item._id) },
  }).lean();
  const evaluationBySubmission = new Map(evaluations.map((item) => [String(item.submission), item]));
  const submissionByAssignment = new Map();
  for (const submission of submissions) {
    submissionByAssignment.set(String(submission.assignment), {
      submission,
      evaluation: evaluationBySubmission.get(String(submission._id)) || null,
    });
  }
  return submissionByAssignment;
}

router.get(
  '/',
  requireAuth,
  asyncHandler(async (req, res) => {
    if (req.user.role === 'faculty') {
      const assignments = await Assignment.find({ createdBy: req.user._id }).sort({ updatedAt: -1 }).lean();
      const ids = assignments.map((item) => item._id);
      const submissions = await Submission.find({ assignment: { $in: ids } }).select('_id assignment').lean();
      const evaluations = await Evaluation.find({
        submission: { $in: submissions.map((item) => item._id) },
      })
        .select('submission')
        .lean();
      const evaluated = new Set(evaluations.map((item) => String(item.submission)));
      const counts = new Map();
      for (const submission of submissions) {
        const key = String(submission.assignment);
        const current = counts.get(key) || { submissionCount: 0, evaluatedCount: 0 };
        current.submissionCount += 1;
        if (evaluated.has(String(submission._id))) current.evaluatedCount += 1;
        counts.set(key, current);
      }
      return res.json(
        assignments.map((assignment) =>
          assignmentJson(assignment, counts.get(String(assignment._id)) || { submissionCount: 0, evaluatedCount: 0 }),
        ),
      );
    }

    const assignments = await Assignment.find({ status: 'published' }).sort({ deadline: 1 }).lean();
    const owned = await submissionMapFor(
      req.user._id,
      assignments.map((item) => item._id),
    );
    res.json(
      assignments.map((assignment) => {
        const match = owned.get(String(assignment._id));
        return assignmentJson(assignment, {
          submission: match ? submissionJson(match.submission, match.evaluation) : null,
        });
      }),
    );
  }),
);

router.post(
  '/',
  requireAuth,
  requireRole('faculty'),
  asyncHandler(async (req, res) => {
    const input = parseAssignment(req.body);
    const assignment = await Assignment.create({ ...input, createdBy: req.user._id });
    res.status(201).json(assignmentJson(assignment, { submissionCount: 0, evaluatedCount: 0 }));
  }),
);

router.get(
  '/:id',
  requireAuth,
  asyncHandler(async (req, res) => {
    const assignment = await Assignment.findById(req.params.id);
    if (!assignment) throw new HttpError(404, 'Assignment not found');

    if (req.user.role === 'faculty') {
      if (!assignment.createdBy.equals(req.user._id)) {
        throw new HttpError(403, 'You can only open your own assignments');
      }
      const submissions = await Submission.find({ assignment: assignment._id }).select('_id').lean();
      const evaluatedCount = await Evaluation.countDocuments({
        submission: { $in: submissions.map((item) => item._id) },
      });
      return res.json(
        assignmentJson(assignment, {
          submissionCount: submissions.length,
          evaluatedCount,
        }),
      );
    }

    if (assignment.status !== 'published') throw new HttpError(404, 'Assignment not found');
    const submission = await Submission.findOne({ assignment: assignment._id, student: req.user._id });
    const evaluation = submission ? await Evaluation.findOne({ submission: submission._id }) : null;
    res.json(assignmentJson(assignment, { submission: submissionJson(submission, evaluation) }));
  }),
);

router.put(
  '/:id',
  requireAuth,
  requireRole('faculty'),
  asyncHandler(async (req, res) => {
    const assignment = await ownAssignment(req.params.id, req.user);
    const input = parseAssignment(req.body);
    const submissionCount = await Submission.countDocuments({ assignment: assignment._id });

    if (assignment.status === 'published' && input.status === 'draft' && submissionCount > 0) {
      throw new HttpError(409, 'This assignment already has submissions, so it cannot return to draft');
    }

    if (input.maxMarks < assignment.maxMarks && submissionCount > 0) {
      const submissions = await Submission.find({ assignment: assignment._id }).select('_id').lean();
      const tooHigh = await Evaluation.findOne({
        submission: { $in: submissions.map((item) => item._id) },
        marks: { $gt: input.maxMarks },
      });
      if (tooHigh) {
        throw new HttpError(409, 'Max marks cannot be lower than marks already awarded');
      }
    }

    Object.assign(assignment, input);
    await assignment.save();
    res.json(assignmentJson(assignment));
  }),
);

router.patch(
  '/:id/publish',
  requireAuth,
  requireRole('faculty'),
  asyncHandler(async (req, res) => {
    const assignment = await ownAssignment(req.params.id, req.user);
    assignment.status = 'published';
    await assignment.save();
    res.json(assignmentJson(assignment));
  }),
);

router.delete(
  '/:id',
  requireAuth,
  requireRole('faculty'),
  asyncHandler(async (req, res) => {
    const assignment = await ownAssignment(req.params.id, req.user);
    const submissionCount = await Submission.countDocuments({ assignment: assignment._id });
    if (submissionCount > 0) {
      throw new HttpError(
        409,
        'Delete is blocked because students have already submitted. Extend the deadline or evaluate the work instead.',
      );
    }
    await assignment.deleteOne();
    res.json({ ok: true });
  }),
);

router.post(
  '/:id/submit',
  requireAuth,
  requireRole('student'),
  upload.single('file'),
  asyncHandler(async (req, res) => {
    if (!req.file) throw new HttpError(400, 'Choose a PDF, DOCX, or ZIP file to upload');

    let cloudinaryUpload = null;
    let committed = false;

    try {
      const assignment = await Assignment.findById(req.params.id);
      if (!assignment || assignment.status !== 'published') {
        throw new HttpError(404, 'Assignment not found');
      }
      if (Date.now() >= new Date(assignment.deadline).getTime()) {
        throw new HttpError(403, 'The deadline has passed. This assignment is no longer accepting submissions.');
      }
      if (!req.file.size) throw new HttpError(400, 'The selected file is empty');

      const originalName = path.basename(req.file.originalname).slice(0, 180);
      const existing = await Submission.findOne({ assignment: assignment._id, student: req.user._id });

      if (existing) {
        const evaluation = await Evaluation.findOne({ submission: existing._id });
        if (evaluation) {
          throw new HttpError(409, 'This submission has already been evaluated and can no longer be replaced.');
        }
      }

      const useCloudinary = process.env.FILE_STORAGE === 'cloudinary';
      let storedName;
      let cloudinaryPublicId = '';
      let cloudinaryFormat = '';

      if (useCloudinary) {
        cloudinaryUpload = await uploadToCloudinary(req.file);
        storedName = cloudinaryUpload.publicId;
        cloudinaryPublicId = cloudinaryUpload.publicId;
        cloudinaryFormat = cloudinaryUpload.format;
      } else {
        storedName = req.file.filename;
      }

      const previousCloudinaryPublicId = existing?.cloudinaryPublicId || '';
      const previousLocalStoredName = existing && !previousCloudinaryPublicId
        ? existing.storedName
        : '';

      if (existing) {
        existing.originalName = originalName;
        existing.storedName = storedName;
        existing.cloudinaryPublicId = cloudinaryPublicId;
        existing.cloudinaryFormat = cloudinaryFormat;
        existing.mimeType = req.file.mimetype;
        existing.size = req.file.size;
        existing.submittedAt = new Date();
        await existing.save();
        committed = true;

        if (previousCloudinaryPublicId && previousCloudinaryPublicId !== cloudinaryPublicId) {
          await safelyDeleteCloudinaryFile(previousCloudinaryPublicId);
        } else if (previousLocalStoredName && previousLocalStoredName !== storedName) {
          await removeLocalFile(previousLocalStoredName);
        }

        return res.json(submissionJson(existing, null));
      }

      const created = await Submission.create({
        assignment: assignment._id,
        student: req.user._id,
        originalName,
        storedName,
        cloudinaryPublicId,
        cloudinaryFormat,
        mimeType: req.file.mimetype,
        size: req.file.size,
        submittedAt: new Date(),
      });
      committed = true;
      return res.status(201).json(submissionJson(created, null));
    } catch (error) {
      if (!committed) {
        if (cloudinaryUpload?.publicId) {
          await safelyDeleteCloudinaryFile(cloudinaryUpload.publicId);
        }
        if (req.file?.path) {
          await removeLocalFile(req.file.filename);
        }
      }
      if (error.code === 11000) {
        throw new HttpError(409, 'You already submitted this assignment. Refresh the page.');
      }
      throw error;
    }
  }),
);

export default router;
