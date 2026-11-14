import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import api, { downloadSubmission } from '../../api';
import Alert from '../../components/Alert';
import Meter from '../../components/Meter';
import StatusPill from '../../components/StatusPill';
import { closesIn, errorMessage, formatBytes, formatWhen, submissionLabel } from '../../utils';

export default function AssignmentDetail() {
  const { id } = useParams();
  const [item, setItem] = useState(null);
  const [file, setFile] = useState(null);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    document.title = 'Assignment · Assignment Desk';
    let active = true;
    api
      .get(`/assignments/${id}`)
      .then(({ data }) => {
        if (active) setItem(data);
      })
      .catch(async (err) => {
        if (active) setError(await errorMessage(err, 'Could not open this assignment.'));
      });
    return () => {
      active = false;
    };
  }, [id]);

  async function onSubmit(event) {
    event.preventDefault();
    setError('');
    setNotice('');
    if (!file) {
      setError('Choose a PDF, DOCX, or ZIP file.');
      return;
    }
    const extension = file.name.split('.').pop().toLowerCase();
    if (!['pdf', 'docx', 'zip'].includes(extension)) {
      setError('Only PDF, DOCX, and ZIP files are allowed.');
      return;
    }
    if (file.size > 15 * 1024 * 1024) {
      setError('File must be 15 MB or smaller.');
      return;
    }

    const body = new FormData();
    body.append('file', file);
    setSubmitting(true);
    try {
      await api.post(`/assignments/${id}/submit`, body);
      const { data } = await api.get(`/assignments/${id}`);
      setItem(data);
      setFile(null);
      setNotice(item?.submission ? 'Submission replaced. The timestamp is now this upload.' : 'Submission recorded.');
    } catch (err) {
      setError(await errorMessage(err, 'Could not upload the file.'));
    } finally {
      setSubmitting(false);
    }
  }

  async function download() {
    try {
      await downloadSubmission(item.submission.id, item.submission.originalName);
    } catch (err) {
      setError(await errorMessage(err, 'Could not download the file.'));
    }
  }

  if (!item && !error) return <p className="muted">Loading assignment…</p>;

  const open = item && new Date(item.deadline).getTime() > Date.now();
  const evaluated = Boolean(item?.submission?.evaluation);
  const status = item ? submissionLabel(item) : null;

  return (
    <div className="page">
      <Link className="back" to="/student/assignments">
        Back to assignments
      </Link>
      <Alert message={error} />
      {notice ? <div className="notice">{notice}</div> : null}
      {item ? (
        <>
          <header className="page-head">
            <div>
              <p className="eyebrow">{item.courseCode}</p>
              <h1>{item.title}</h1>
              <p className="lede">{item.courseName}</p>
            </div>
            <StatusPill tone={status.tone}>{status.label}</StatusPill>
          </header>
          <section className="card detail-grid">
            <div>
              <p className="stat-label">Deadline</p>
              <p>
                {formatWhen(item.deadline)}
                <br />
                <span className="muted">{closesIn(item.deadline)}</span>
              </p>
            </div>
            <div>
              <p className="stat-label">Maximum marks</p>
              <p className="stat-value small">{item.maxMarks}</p>
            </div>
          </section>
          <section className="card">
            <h2>Brief</h2>
            <p className="prose">{item.description}</p>
          </section>

          {item.submission ? (
            <section className="card">
              <h2>Your submission</h2>
              <p>
                <strong>{item.submission.originalName}</strong>
                <span className="dot">·</span>
                {formatBytes(item.submission.size)}
              </p>
              <p className="muted">Recorded {formatWhen(item.submission.submittedAt)}</p>
              <button type="button" className="btn ghost" onClick={download}>
                Download file
              </button>
              {evaluated ? (
                <div className="result-block">
                  <p className="stat-label">Marks</p>
                  <p className="stat-value small">
                    {item.submission.evaluation.marks} / {item.maxMarks}
                  </p>
                  <Meter value={item.submission.evaluation.marks} max={item.maxMarks} tone="gold" />
                  <p className="feedback">{item.submission.evaluation.feedback}</p>
                  <p className="muted">Evaluated {formatWhen(item.submission.evaluation.evaluatedAt)}</p>
                </div>
              ) : (
                <p className="muted">Waiting for faculty evaluation.</p>
              )}
            </section>
          ) : null}

          {open && !evaluated ? (
            <form className="card dropzone" onSubmit={onSubmit}>
              <h2>{item.submission ? 'Replace submission' : 'Upload submission'}</h2>
              <p className="muted">
                PDF, DOCX, or ZIP, up to 15 MB. The server stores the upload time. A file can be replaced until it is
                evaluated.
              </p>
              <input
                type="file"
                accept=".pdf,.docx,.zip,application/pdf,application/zip"
                onChange={(event) => setFile(event.target.files?.[0] || null)}
              />
              {file ? <p>{file.name}</p> : null}
              <button className="btn primary" type="submit" disabled={submitting}>
                {submitting ? 'Uploading…' : item.submission ? 'Replace file' : 'Submit file'}
              </button>
            </form>
          ) : null}

          {!open && !item.submission ? (
            <section className="card">
              <h2>Submissions are closed</h2>
              <p className="muted">The deadline has passed and no file was recorded for your account.</p>
            </section>
          ) : null}
        </>
      ) : null}
    </div>
  );
}
