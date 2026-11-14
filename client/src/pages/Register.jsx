import { useEffect, useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import Alert from '../components/Alert';
import { useAuth } from '../context/AuthContext';
import { errorMessage } from '../utils';

const EMPTY = {
  name: '',
  email: '',
  password: '',
  role: 'student',
  rollNumber: '',
  department: 'Computer Science and Engineering',
  facultyCode: '',
};

export default function Register() {
  const { user, loading, register } = useAuth();
  const [form, setForm] = useState(EMPTY);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    document.title = 'Create account · Assignment Desk';
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
      await register(form);
    } catch (err) {
      setError(await errorMessage(err, 'Could not create the account.'));
      setSubmitting(false);
    }
  }

  return (
    <div className="auth-screen">
      <section className="auth-copy">
        <div className="auth-intro">
          <p className="auth-kicker">Create an account</p>
          <h1>Join the department workspace.</h1>
          <p className="auth-lede">
            Students submit work against published deadlines. Faculty create assignments and record marks with feedback.
          </p>
        </div>
        <ul className="auth-points" aria-label="How the workspace helps">
          <li>
            <span className="auth-point-index">01</span>
            <strong>Keep course work together</strong>
            <p>Assignments, submissions, and evaluations share one workspace.</p>
          </li>
          <li>
            <span className="auth-point-index">02</span>
            <strong>Know what is due</strong>
            <p>Students can see published work and its submission deadline.</p>
          </li>
          <li>
            <span className="auth-point-index">03</span>
            <strong>Review with context</strong>
            <p>Faculty return marks and feedback with the submitted work.</p>
          </li>
        </ul>
        <p className="team">Use a faculty account only if you are setting or evaluating assignments.</p>
      </section>
      <section className="auth-panel">
        <form className="auth-card" onSubmit={onSubmit}>
          <p className="eyebrow">Register</p>
          <h2>Choose your role</h2>
          <Alert message={error} />
          <div className="role-switch" role="group" aria-label="Role">
            {['student', 'faculty'].map((role) => (
              <button
                key={role}
                type="button"
                className={form.role === role ? 'btn primary' : 'btn ghost'}
                onClick={() => setForm((current) => ({ ...current, role }))}
              >
                {role === 'student' ? 'Student' : 'Faculty'}
              </button>
            ))}
          </div>
          <label className="field">
            Full name
            <input name="name" value={form.name} onChange={update} autoComplete="name" required />
          </label>
          <label className="field">
            Email
            <input name="email" type="email" value={form.email} onChange={update} autoComplete="email" required />
          </label>
          <label className="field">
            Password
            <input
              name="password"
              type="password"
              value={form.password}
              onChange={update}
              autoComplete="new-password"
              minLength={8}
              required
            />
            <small className="hint">At least 8 characters.</small>
          </label>
          {form.role === 'faculty' ? (
            <label className="field">
              Faculty registration code
              <input
                name="facultyCode"
                type="password"
                value={form.facultyCode}
                onChange={update}
                autoComplete="off"
              />
              <small className="hint">Required for faculty registration on the deployed website.</small>
            </label>
          ) : null}
          {form.role === 'student' ? (
            <label className="field">
              Roll number
              <input name="rollNumber" value={form.rollNumber} onChange={update} required />
            </label>
          ) : null}
          <label className="field">
            Department
            <input name="department" value={form.department} onChange={update} />
          </label>
          <button className="btn primary wide" type="submit" disabled={submitting}>
            {submitting ? 'Creating account…' : 'Create account'}
          </button>
          <p className="auth-switch">
            Already registered? <Link to="/login">Sign in</Link>
          </p>
        </form>
      </section>
    </div>
  );
}
