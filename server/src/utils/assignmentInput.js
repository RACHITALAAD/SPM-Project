import { HttpError } from './httpError.js';

export function parseAssignment(body) {
  const title = String(body.title ?? '').trim();
  const courseCode = String(body.courseCode ?? '').trim().toUpperCase();
  const courseName = String(body.courseName ?? '').trim();
  const description = String(body.description ?? '').trim();
  const deadline = new Date(body.deadline);
  const maxMarks = Number(body.maxMarks);
  const status = body.status === 'published' ? 'published' : 'draft';

  if (title.length < 3 || title.length > 140) {
    throw new HttpError(400, 'Title must be between 3 and 140 characters');
  }
  if (!/^[A-Z0-9][A-Z0-9 -]{1,15}$/.test(courseCode)) {
    throw new HttpError(400, 'Course code should be 2–16 characters, using letters, numbers, spaces, or hyphens');
  }
  if (courseName.length < 2 || courseName.length > 80) {
    throw new HttpError(400, 'Course name must be between 2 and 80 characters');
  }
  if (description.length < 10 || description.length > 4000) {
    throw new HttpError(400, 'Description must be between 10 and 4000 characters');
  }
  if (Number.isNaN(deadline.getTime())) {
    throw new HttpError(400, 'Enter a valid deadline');
  }
  if (!Number.isInteger(maxMarks) || maxMarks < 1 || maxMarks > 100) {
    throw new HttpError(400, 'Max marks must be a whole number from 1 to 100');
  }

  return { title, courseCode, courseName, description, deadline, maxMarks, status };
}
