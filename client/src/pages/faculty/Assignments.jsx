import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../../api';
import Alert from '../../components/Alert';
import PageHeader from '../../components/PageHeader';
import StatusPill from '../../components/StatusPill';
import { errorMessage, formatWhen } from '../../utils';

export default function FacultyAssignments() {
  const [items, setItems] = useState(null);
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');

  async function load() {
    const { data } = await api.get('/assignments');
    setItems(data);
  }

  useEffect(() => {
    document.title = 'Manage assignments · Assignment Desk';
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

  async function publish(item) {
    setError('');
    try {
      await api.patch(`/assignments/${item.id}/publish`);
      await load();
    } catch (err) {
      setError(await errorMessage(err, 'Could not publish this assignment.'));
    }
  }

  async function remove(item) {
    const confirmed = window.confirm(`Delete “${item.title}”? This cannot be undone.`);
    if (!confirmed) return;
    setError('');
    try {
      await api.delete(`/assignments/${item.id}`);
      setItems((current) => current.filter((entry) => entry.id !== item.id));
    } catch (err) {
      setError(await errorMessage(err, 'Could not delete this assignment.'));
    }
  }

  const visible = (items || []).filter((item) => {
    const haystack = `${item.title} ${item.courseCode} ${item.courseName}`.toLowerCase();
    return haystack.includes(query.trim().toLowerCase());
  });

  return (
    <div className="page">
      <PageHeader
        eyebrow="Faculty"
        title="Assignments"
        // lede="Drafts stay hidden from students. Publish when the brief and deadline are final. Extend a deadline from Edit if the class needs more time."
        actions={
          <Link className="btn primary" to="/faculty/assignments/new">
            New assignment
          </Link>
        }
      />
      <Alert message={error} />
      <label className="field search-field">
        Search
        <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Course or title" />
      </label>
      {!items && !error ? <p className="muted">Loading assignments…</p> : null}
      {items && visible.length === 0 ? (
        <p className="empty">{items.length === 0 ? 'No assignments yet.' : 'No assignments match this search.'}</p>
      ) : null}
      {visible.length > 0 ? (
        <div className="table-wrap card">
          <table>
            <thead>
              <tr>
                <th>Assignment</th>
                <th>Deadline</th>
                <th>Status</th>
                <th>Submissions</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {visible.map((item) => (
                <tr key={item.id}>
                  <td>
                    <span className="code">{item.courseCode}</span>
                    <div>{item.title}</div>
                    <div className="muted">{item.courseName}</div>
                  </td>
                  <td>{formatWhen(item.deadline)}</td>
                  <td>
                    <StatusPill tone={item.status}>{item.status === 'published' ? 'Published' : 'Draft'}</StatusPill>
                  </td>
                  <td>
                    {item.submissionCount} received
                    <div className="muted">{item.evaluatedCount} evaluated</div>
                  </td>
                  <td className="row-actions">
                    <Link className="btn ghost" to={`/faculty/assignments/${item.id}/edit`}>
                      Edit
                    </Link>
                    <Link className="btn ghost" to={`/faculty/assignments/${item.id}/submissions`}>
                      Submissions
                    </Link>
                    {item.status === 'draft' ? (
                      <button type="button" className="btn primary" onClick={() => publish(item)}>
                        Publish
                      </button>
                    ) : null}
                    <button type="button" className="btn danger" onClick={() => remove(item)}>
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
    </div>
  );
}
