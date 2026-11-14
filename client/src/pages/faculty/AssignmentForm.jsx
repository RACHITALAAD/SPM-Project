import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import api from '../../api';
import Alert from '../../components/Alert';
import { errorMessage, toLocalInput } from '../../utils';

const EMPTY = {
  title: '',
  courseCode: '',
  courseName: '',
  description: '',
  deadline: '',
  maxMarks: 20,
  status: 'draft',
};

export default function AssignmentForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [form, setForm] = useState(EMPTY);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(Boolean(id));
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    document.title = id ? 'Edit assignment · Assignment Desk' : 'New assignment · Assignment Desk';
    if (!id) return undefined;
    let active = true;
    api
      .get(`/assignments/${id}`)
      .then(({ data }) => {
        if (!active) return;
        setForm({
          title: data.title,
          courseCode: data.courseCode,
          courseName: data.courseName,
          description: data.description,
          deadline: toLocalInput(data.deadline),
          maxMarks: data.maxMarks,
          status: data.status,
        });
      })
      .catch(async (err) => {
        if (active) setError(await errorMessage(err, 'Could not load this assignment.'));
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [id]);

  function update(event) {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
  }

  async function onSubmit(event) {
    event.preventDefault();
    setError('');
    const deadline = new Date(form.deadline);
    if (Number.isNaN(deadline.getTime())) {
      setError('Enter a valid deadline.');
      return;
    }
    const payload = {
      ...form,
      maxMarks: Number(form.maxMarks),
      deadline: deadline.toISOString(),
    };
    setSaving(true);
    try {
      if (id) await api.put(`/assignments/${id}`, payload);
      else await api.post('/assignments', payload);
      navigate('/faculty/assignments');
    } catch (err) {
      setError(await errorMessage(err, 'Could not save this assignment.'));
      setSaving(false);
    }
  }

  return (
    <div className="page narrow">
      <Link className="back" to="/faculty/assignments">
        Back to assignments
      </Link>
      <header className="page-head">
        <div>
          <p className="eyebrow">Faculty</p>
          <h1>{id ? 'Edit assignment' : 'New assignment'}</h1>
          {/* <p className="lede">Students see an assignment only after it is published.</p> */}
        </div>
      </header>
      {loading ? <p className="muted">Loading assignment…</p> : null}
      {!loading ? (
        <form className="card form-grid" onSubmit={onSubmit}>
          <Alert message={error} />
          <label className="field">
            Title
            <input name="title" value={form.title} onChange={update} required minLength={3} maxLength={140} />
          </label>
          <div className="two">
            <label className="field">
              Course code
              <input name="courseCode" value={form.courseCode} onChange={update} required />
            </label>
            <label className="field">
              Course name
              <input name="courseName" value={form.courseName} onChange={update} required />
            </label>
          </div>
          <label className="field">
            Description
            <textarea name="description" value={form.description} onChange={update} required minLength={10} />
          </label>
          <div className="two">
            <label className="field">
              Deadline
              <input name="deadline" type="datetime-local" value={form.deadline} onChange={update} required />
            </label>
            <label className="field">
              Maximum marks
              <input
                name="maxMarks"
                type="number"
                min="1"
                max="100"
                step="1"
                value={form.maxMarks}
                onChange={update}
                required
              />
              <small className="hint">Whole number from 1 to 100.</small>
            </label>
          </div>
          <label className="field">
            Visibility
            <select name="status" value={form.status} onChange={update}>
              <option value="draft">Draft — hidden from students</option>
              <option value="published">Published — open for submission</option>
            </select>
          </label>
          <div className="page-actions">
            <button className="btn primary" type="submit" disabled={saving}>
              {saving ? 'Saving…' : id ? 'Save changes' : 'Create assignment'}
            </button>
          </div>
        </form>
      ) : null}
    </div>
  );
}
