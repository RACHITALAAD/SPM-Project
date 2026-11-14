import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../../api';
import Alert from '../../components/Alert';
import PageHeader from '../../components/PageHeader';
import StatusPill from '../../components/StatusPill';
import { closesIn, errorMessage, formatWhen, submissionLabel } from '../../utils';

export default function StudentAssignments() {
  const [items, setItems] = useState(null);
  const [query, setQuery] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    document.title = 'Assignments · Assignment Desk';
    let active = true;
    api
      .get('/assignments')
      .then(({ data }) => {
        if (active) setItems(data);
      })
      .catch(async (err) => {
        if (active) setError(await errorMessage(err, 'Could not load assignments.'));
      });
    return () => {
      active = false;
    };
  }, []);

  const visible = (items || []).filter((item) => {
    const haystack = `${item.title} ${item.courseCode} ${item.courseName}`.toLowerCase();
    return haystack.includes(query.trim().toLowerCase());
  });

  return (
    <div className="page">
      <PageHeader
        eyebrow="Student"
        title="Assignments"
        // lede="Only published assignments are listed. Upload a PDF, DOCX, or ZIP before the deadline."
      />
      <Alert message={error} />
      <label className="field search-field">
        Search
        <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Course or title" />
      </label>
      {!items && !error ? <p className="muted">Loading assignments…</p> : null}
      {items && visible.length === 0 ? (
        <p className="empty">{query.trim() ? 'No assignments match this search.' : 'No published assignments yet.'}</p>
      ) : null}
      <div className="assignment-grid">
        {visible.map((item) => {
          const status = submissionLabel(item);
          return (
            <article key={item.id} className="card assignment-card">
              <div className="card-top">
                <span className="code">{item.courseCode}</span>
                <StatusPill tone={status.tone}>{status.label}</StatusPill>
              </div>
              <h2>{item.title}</h2>
              <p className="muted">{item.courseName}</p>
              <p>
                {closesIn(item.deadline)}
                <span className="dot">·</span>
                {formatWhen(item.deadline)}
              </p>
              <p className="muted">Out of {item.maxMarks}</p>
              <Link className="btn primary" to={`/student/assignments/${item.id}`}>
                Open
              </Link>
            </article>
          );
        })}
      </div>
    </div>
  );
}
