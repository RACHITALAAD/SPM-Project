import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../../api';
import Alert from '../../components/Alert';
import Meter from '../../components/Meter';
import PageHeader from '../../components/PageHeader';
import Stat from '../../components/Stat';
import { useAuth } from '../../context/AuthContext';
import { closesIn, errorMessage, formatWhen, greeting } from '../../utils';

export default function StudentDashboard() {
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    document.title = 'Dashboard · Assignment Desk';
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
        eyebrow="Student"
        title={greeting(user.name)}
        // lede="Published assignments, your submission status, and feedback that has already been released."
      />
      <Alert message={error} />
      {!data && !error ? <p className="muted">Loading dashboard…</p> : null}
      {stats ? (
        <section className="stats">
          <Stat label="Published" value={stats.assigned} />
          <Stat label="Submitted" value={stats.submitted} />
          <Stat label="Still to submit" value={stats.pendingSubmission} />
          <Stat label="Average score" value={stats.averagePercent === null ? '—' : `${stats.averagePercent}%`} />
        </section>
      ) : null}

      {data ? (
        <div className="split-panels">
          <section className="card">
            <h2>Coming up</h2>
            {data.upcoming.length === 0 ? (
              <p className="muted">Nothing is waiting on you. Open assignments to review closed work.</p>
            ) : (
              <ul className="plain-list">
                {data.upcoming.map((item) => (
                  <li key={item.id}>
                    <div>
                      <p className="code">{item.courseCode}</p>
                      <Link to={`/student/assignments/${item.id}`}>{item.title}</Link>
                      <p className="muted">
                        {closesIn(item.deadline)} · {formatWhen(item.deadline)}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>
          <section className="card">
            <h2>Recent results</h2>
            {data.results.length === 0 ? (
              <p className="muted">Marks appear here after faculty evaluation.</p>
            ) : (
              <ul className="plain-list">
                {data.results.map((item) => (
                  <li key={item.submissionId}>
                    <div>
                      <p className="code">{item.courseCode}</p>
                      <strong>
                        {item.marks} / {item.maxMarks}
                      </strong>
                      <p>{item.title}</p>
                      <Meter value={item.marks} max={item.maxMarks} tone="gold" />
                      <p className="feedback">{item.feedback}</p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      ) : null}
    </div>
  );
}
