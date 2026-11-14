export function evaluationJson(evaluation) {
  if (!evaluation) return null;
  return {
    marks: evaluation.marks,
    feedback: evaluation.feedback,
    evaluatedAt: evaluation.evaluatedAt,
  };
}

export function submissionJson(submission, evaluation = null) {
  if (!submission) return null;
  return {
    id: submission._id,
    originalName: submission.originalName,
    size: submission.size,
    mimeType: submission.mimeType,
    submittedAt: submission.submittedAt,
    evaluation: evaluationJson(evaluation),
  };
}

export function assignmentJson(assignment, extra = {}) {
  return {
    id: assignment._id,
    title: assignment.title,
    courseCode: assignment.courseCode,
    courseName: assignment.courseName,
    description: assignment.description,
    deadline: assignment.deadline,
    maxMarks: assignment.maxMarks,
    status: assignment.status,
    createdAt: assignment.createdAt,
    updatedAt: assignment.updatedAt,
    ...extra,
  };
}
