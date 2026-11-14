import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import api, { downloadSubmission } from '../../api';
import Alert from '../../components/Alert';
import { errorMessage, formatBytes, formatWhen } from '../../utils';

export default function Evaluate() {
  const { id } = useParams();
  const [item, setItem] = useState(null);
  const [marks, setMarks] = useState('');
  const [feedback, setFeedback] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    document.title = 'Evaluate · Assignment Desk';
    let active = true;
    api
      .get(`/submissions/${id}`)
      .then(({ data }) => {
        if (!active) return;
        setItem(data);
        if (data.evaluation) {
          setMarks(String(data.evaluation.marks));
          setFeedback(data.evaluation.feedback);
        }
      })
      .catch(async (err) => {
        if (active) setError(await errorMessage(err, 'Could not open this submission.'));
      });
    return () => {
      active = false;
    };
  }, [id]);

  async function onSubmit(event) {
    event.preventDefault();
    setSaving(true);
    setError('');
    setNotice('');
    try {
      await api.post(`/submissions/${id}/evaluate`, { marks: Number(marks), feedback });
      setItem((current) => ({ ...current, evaluation: { marks: Number(marks), feedback } }));
      setNotice('Marks and feedback saved. The student can see them now.');
    } catch (err) {
      setError(await errorMessage(err, 'Could not save the evaluation.'));
    } finally {
      setSaving(false);
    }
  }

  async function download() {
    try {
      await downloadSubmission(item.id, item.originalName);
    } catch (err) {
      setError(await errorMessage(err, 'Could not download the file.'));
    }
  }

  if (!item && !error) return <p className="muted">Loading submission…</p>;

  return (
    <div className="page narrow">
      {item ? (
        <Link className="back" to={`/faculty/assignments/${item.assignment.id}/submissions`}>
          Back to submissions
        </Link>
      ) : null}
      <Alert message={error} />
      {notice ? <div className="notice">{notice}</div> : null}
      {item ? (
        <>
          <header className="page-head">
            <div>
              <p className="eyebrow">{item.assignment.courseCode}</p>
              <h1>{item.student.name}</h1>
              <p className="lede">
                {item.student.rollNumber || item.student.email} · {item.assignment.title}
              </p>
            </div>
          </header>
          <section className="card">
            <p>
              <strong>{item.originalName}</strong>
              <span className="dot">·</span>
              {formatBytes(item.size)}
            </p>
            <p className="muted">Submitted {formatWhen(item.submittedAt)}</p>
            <button type="button" className="btn ghost" onClick={download}>
              Download submission
            </button>
          </section>
          <form className="card form-grid" onSubmit={onSubmit}>
            <label className="field">
              Marks out of {item.assignment.maxMarks}
              <input
                type="number"
                min="0"
                max={item.assignment.maxMarks}
                step="1"
                value={marks}
                onChange={(event) => setMarks(event.target.value)}
                required
              />
            </label>
            <label className="field">
              Feedback
              <textarea value={feedback} onChange={(event) => setFeedback(event.target.value)} required minLength={5} />
              <small className="hint">At least a short note. Students see this text with the marks.</small>
            </label>
            <button className="btn primary" type="submit" disabled={saving}>
              {saving ? 'Saving…' : item.evaluation ? 'Update evaluation' : 'Save evaluation'}
            </button>
          </form>
        </>
      ) : null}
    </div>
  );
}
