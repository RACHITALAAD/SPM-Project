import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import api, { downloadSubmission } from '../../api';
import Alert from '../../components/Alert';
import StatusPill from '../../components/StatusPill';
import { errorMessage, formatBytes, formatWhen } from '../../utils';

export default function FacultySubmissions() {
  const { id } = useParams();
  const [data, setData] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    document.title = 'Submissions · Assignment Desk';
    let active = true;
    api
      .get(`/submissions/assignment/${id}`)
      .then(({ data: body }) => {
        if (active) setData(body);
      })
      .catch(async (err) => {
        if (active) setError(await errorMessage(err, 'Could not load submissions.'));
      });
    return () => {
      active = false;
    };
  }, [id]);

  async function download(item) {
    try {
      await downloadSubmission(item.id, item.originalName);
    } catch (err) {
      setError(await errorMessage(err, 'Could not download the file.'));
    }
  }

  return (
    <div className="page">
      <Link className="back" to="/faculty/assignments">
        Back to assignments
      </Link>
      <Alert message={error} />
      {!data && !error ? <p className="muted">Loading submissions…</p> : null}
      {data ? (
        <>
          <header className="page-head">
            <div>
              <p className="eyebrow">{data.assignment.courseCode}</p>
              <h1>{data.assignment.title}</h1>
              <p className="lede">
                Deadline {formatWhen(data.assignment.deadline)} · out of {data.assignment.maxMarks}
              </p>
            </div>
            <Link className="btn ghost" to={`/faculty/assignments/${id}/edit`}>
              Edit assignment
            </Link>
          </header>
          {data.submissions.length === 0 ? (
            <p className="empty">No submissions yet. Students appear here after they upload.</p>
          ) : (
            <div className="table-wrap card">
              <table>
                <thead>
                  <tr>
                    <th>Student</th>
                    <th>File</th>
                    <th>Submitted</th>
                    <th>Status</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {data.submissions.map((item) => (
                    <tr key={item.id}>
                      <td>
                        <strong>{item.student.name}</strong>
                        <div className="muted">{item.student.rollNumber || item.student.email}</div>
                      </td>
                      <td>
                        <button type="button" className="text-button" onClick={() => download(item)}>
                          {item.originalName}
                        </button>
                        <div className="muted">{formatBytes(item.size)}</div>
                      </td>
                      <td>{formatWhen(item.submittedAt)}</td>
                      <td>
                        {item.evaluation ? (
                          <StatusPill tone="evaluated">
                            {item.evaluation.marks}/{data.assignment.maxMarks}
                          </StatusPill>
                        ) : (
                          <StatusPill tone="pending">Pending</StatusPill>
                        )}
                      </td>
                      <td>
                        <Link className="btn primary" to={`/faculty/submissions/${item.id}/evaluate`}>
                          {item.evaluation ? 'Update' : 'Evaluate'}
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      ) : null}
    </div>
  );
}
