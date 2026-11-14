import { useEffect, useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import Alert from '../components/Alert';
import { useAuth } from '../context/AuthContext';
import { errorMessage } from '../utils';

const DEMOS = {
  faculty: { email: 'faculty@iiitv.edu.in', password: 'Faculty@123' },
  student: { email: 'student.aarav@iiitv.edu.in', password: 'Student@123' },
};

export default function Login() {
  const { user, loading, login } = useAuth();
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    document.title = 'Sign in · Assignment Desk';
  }, []);

  if (loading) return <div className="boot">Opening your workspace…</div>;
  if (user) return <Navigate to={user.role === 'faculty' ? '/faculty' : '/student'} replace />;

  function update(event) {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
  }

  async function onSubmit(event) {
    event.preventDefault();
    setSubmitting(true);
    setError('');
    try {
      await login(form.email, form.password);
    } catch (err) {
      setError(await errorMessage(err, 'Could not sign in.'));
      setSubmitting(false);
    }
  }

  return (
    <div className="auth-screen">
      <section className="auth-copy">
        <div className="auth-intro">
          <p className="auth-kicker">Department workspace</p>
          <h1>Centralized Assignment Submission and Evaluation Platform</h1>
          <p className="auth-lede">
            A department-owned workspace for publishing assignments, collecting timestamped submissions, and returning
            marks with feedback.
          </p>
        </div>
        <ul className="auth-points" aria-label="Platform features">
          <li>
            <span className="auth-point-index">01</span>
            <strong>One shared workspace</strong>
            <p>Assignments and submissions stay organized by course.</p>
          </li>
          <li>
            <span className="auth-point-index">02</span>
            <strong>Deadline-aware submissions</strong>
            <p>Submission times are recorded and deadlines are enforced.</p>
          </li>
          <li>
            <span className="auth-point-index">03</span>
            <strong>Clear evaluation</strong>
            <p>Marks and feedback stay connected to each submission.</p>
          </li>
        </ul>
      </section>
      <section className="auth-panel">
        <form className="auth-card" onSubmit={onSubmit}>
          <p className="eyebrow">Sign in</p>
          <h2>Open your desk</h2>
          <Alert message={error} />
          <label className="field">
            Email
            <input
              name="email"
              type="email"
              autoComplete="email"
              value={form.email}
              onChange={update}
              required
            />
          </label>
          <label className="field">
            Password
            <input
              name="password"
              type="password"
              autoComplete="current-password"
              value={form.password}
              onChange={update}
              required
            />
          </label>
          <button className="btn primary wide" type="submit" disabled={submitting}>
            {submitting ? 'Signing in…' : 'Sign in'}
          </button>
          {import.meta.env.DEV ? (
            <div className="demo-row">
              <button type="button" className="btn ghost" onClick={() => setForm(DEMOS.faculty)}>
                Faculty demo
              </button>
              <button type="button" className="btn ghost" onClick={() => setForm(DEMOS.student)}>
                Student demo
              </button>
            </div>
          ) : null}
          <p className="auth-switch">
            New here? <Link to="/register">Create an account</Link>
          </p>
        </form>
      </section>
    </div>
  );
}
