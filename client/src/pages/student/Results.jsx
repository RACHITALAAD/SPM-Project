import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api, { downloadSubmission } from '../../api';
import Alert from '../../components/Alert';
import Meter from '../../components/Meter';
import PageHeader from '../../components/PageHeader';
import StatusPill from '../../components/StatusPill';
import { errorMessage, formatBytes, formatWhen } from '../../utils';

export default function Results() {
  const [items, setItems] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    document.title = 'Results · Assignment Desk';
    let active = true;
    api
      .get('/submissions/mine')
      .then(({ data }) => {
        if (active) setItems(data);
      })
      .catch(async (err) => {
        if (active) setError(await errorMessage(err, 'Could not load your results.'));
      });
    return () => {
      active = false;
    };
  }, []);

  return (
    <div className="page">
      <PageHeader
        eyebrow="Student"
        title="Results"
        
      />
      <Alert message={error} />
      {!items && !error ? <p className="muted">Loading results…</p> : null}
      {items && items.length === 0 ? <p className="empty">You have not submitted any work yet.</p> : null}
      <div className="stack">
        {items?.map((item) => (
          <article key={item.id} className="card">
            <div className="card-top">
              <span className="code">{item.assignment.courseCode}</span>
              <StatusPill tone={item.evaluation ? 'evaluated' : 'submitted'}>
                {item.evaluation ? 'Evaluated' : 'Awaiting evaluation'}
              </StatusPill>
            </div>
            <h2>
              <Link to={`/student/assignments/${item.assignment.id}`}>{item.assignment.title}</Link>
            </h2>
            <p className="muted">
              {item.originalName}
              <span className="dot">·</span>
              {formatBytes(item.size)}
              <span className="dot">·</span>
              {formatWhen(item.submittedAt)}
            </p>
            {item.evaluation ? (
              <div className="result-block">
                <p className="stat-value small">
                  {item.evaluation.marks} / {item.assignment.maxMarks}
                </p>
                <Meter value={item.evaluation.marks} max={item.assignment.maxMarks} tone="gold" />
                <p className="feedback">{item.evaluation.feedback}</p>
              </div>
            ) : (
              <p className="muted">Faculty have not recorded marks for this file yet.</p>
            )}
            <button
              type="button"
              className="btn ghost"
              onClick={async () => {
                try {
                  await downloadSubmission(item.id, item.originalName);
                } catch (err) {
                  setError(await errorMessage(err, 'Could not download the file.'));
                }
              }}
            >
              Download
            </button>
          </article>
        ))}
      </div>
    </div>
  );
}
