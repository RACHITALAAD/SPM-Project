import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../../api';
import Alert from '../../components/Alert';
import Meter from '../../components/Meter';
import PageHeader from '../../components/PageHeader';
import Stat from '../../components/Stat';
import StatusPill from '../../components/StatusPill';
import { useAuth } from '../../context/AuthContext';
import { errorMessage, formatWhen, greeting } from '../../utils';

export default function FacultyDashboard() {
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    document.title = 'Faculty dashboard · Assignment Desk';
    let active = true;
    api
      .get('/dashboard')
      .then(({ data: body }) => {
        if (active) setData(body);
      })
      .catch(async (err) => {
        if (active) setError(await errorMessage(err, 'Could not load the dashboard.'));
      });
    return () => {
      active = false;
    };
  }, []);

  const stats = data?.stats;

  return (
    <div className="page">
      <PageHeader
        eyebrow="Faculty"
        title={greeting(user.name)}
        // lede="Class progress is the share of registered students who have submitted each published assignment."
        actions={
          <Link className="btn primary" to="/faculty/assignments/new">
            New assignment
          </Link>
        }
      />
      <Alert message={error} />
      {!data && !error ? <p className="muted">Loading dashboard…</p> : null}
      {stats ? (
        <section className="stats">
          <Stat label="Assignments" value={stats.assignments} />
          <Stat label="Awaiting evaluation" value={stats.pending} />
          <Stat label="Evaluated" value={stats.evaluated} />
          <Stat label="Students" value={stats.students} />
        </section>
      ) : null}

      {data ? (
        <div className="split-panels">
          <section className="card">
            <h2>Class progress</h2>
            {data.assignments.length === 0 ? <p className="muted">Create an assignment to start the register.</p> : null}
            <ul className="plain-list">
              {data.assignments.map((item) => {
                const ratio = item.studentCount ? item.submissionCount / item.studentCount : 0;
                return (
                  <li key={item.id}>
                    <div>
                      <div className="card-top">
                        <span className="code">{item.courseCode}</span>
                        <StatusPill tone={item.status}>{item.status === 'published' ? 'Published' : 'Draft'}</StatusPill>
                      </div>
                      <Link to={`/faculty/assignments/${item.id}/submissions`}>{item.title}</Link>
                      <p className="muted">
                        {item.submissionCount} of {item.studentCount} submitted · {item.evaluatedCount} evaluated ·{' '}
                        {formatWhen(item.deadline)}
                      </p>
                      {item.status === 'published' ? <Meter value={ratio} max={1} /> : null}
                    </div>
                  </li>
                );
              })}
            </ul>
          </section>
          <section className="card">
            <h2>Waiting for marks</h2>
            {data.pending.length === 0 ? <p className="muted">Every received submission has been evaluated.</p> : null}
            <ul className="plain-list">
              {data.pending.map((item) => (
                <li key={item.submissionId}>
                  <div>
                    <p className="code">{item.courseCode}</p>
                    <strong>{item.studentName}</strong>
                    <p className="muted">{item.rollNumber || 'No roll number'}</p>
                    <p>{item.assignmentTitle}</p>
                    <p className="muted">{formatWhen(item.submittedAt)}</p>
                    <Link className="btn primary" to={`/faculty/submissions/${item.submissionId}/evaluate`}>
                      Evaluate
                    </Link>
                  </div>
                </li>
              ))}
            </ul>
          </section>
        </div>
      ) : null}
    </div>
  );
}
