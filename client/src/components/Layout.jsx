import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Layout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const path = useLocation().pathname;
  const faculty = user.role === 'faculty';

  const links = faculty
    ? [
        { to: '/faculty', label: 'Dashboard', active: path === '/faculty' },
        {
          to: '/faculty/assignments',
          label: 'Assignments',
          active: path.startsWith('/faculty/assignments') && path !== '/faculty/assignments/new',
        },
        { to: '/faculty/assignments/new', label: 'New assignment', active: path === '/faculty/assignments/new' },
      ]
    : [
        { to: '/student', label: 'Dashboard', active: path === '/student' },
        { to: '/student/assignments', label: 'Assignments', active: path.startsWith('/student/assignments') },
        { to: '/student/results', label: 'Results', active: path.startsWith('/student/results') },
      ];

  function signOut() {
    logout();
    navigate('/login');
  }

  return (
    <div className="shell">
      <aside className="sidebar">
        <Link to={faculty ? '/faculty' : '/student'} className="brand">
          <span className="seal">AD</span>
          <span>
            <strong>Assignment Desk</strong>
            <small>IIIT Vadodara</small>
          </span>
        </Link>
        <nav className="nav">
          {links.map((link) => (
            <Link key={link.to} to={link.to} className={link.active ? 'nav-link active' : 'nav-link'}>
              {link.label}
            </Link>
          ))}
        </nav>
        <div className="who">
          <p className="who-name">{user.name}</p>
          <p className="who-meta">{faculty ? 'Faculty' : `Student · ${user.rollNumber || 'No roll number'}`}</p>
          <button type="button" className="signout" onClick={signOut}>
            Sign out
          </button>
        </div>
      </aside>
      <div className="main-wrap">
        <main className="main">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
