import { Navigate, Route, Routes } from 'react-router-dom';
import Layout from './components/Layout';
import ProtectedRoute, { HomeRedirect } from './components/ProtectedRoute';
import Login from './pages/Login';
import Register from './pages/Register';
import FacultyAssignments from './pages/faculty/Assignments';
import AssignmentForm from './pages/faculty/AssignmentForm';
import FacultyDashboard from './pages/faculty/Dashboard';
import Evaluate from './pages/faculty/Evaluate';
import FacultySubmissions from './pages/faculty/Submissions';
import AssignmentDetail from './pages/student/AssignmentDetail';
import StudentAssignments from './pages/student/Assignments';
import StudentDashboard from './pages/student/Dashboard';
import Results from './pages/student/Results';

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<HomeRedirect />} />
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />

      <Route element={<ProtectedRoute role="student" />}>
        <Route element={<Layout />}>
          <Route path="/student" element={<StudentDashboard />} />
          <Route path="/student/assignments" element={<StudentAssignments />} />
          <Route path="/student/assignments/:id" element={<AssignmentDetail />} />
          <Route path="/student/results" element={<Results />} />
        </Route>
      </Route>

      <Route element={<ProtectedRoute role="faculty" />}>
        <Route element={<Layout />}>
          <Route path="/faculty" element={<FacultyDashboard />} />
          <Route path="/faculty/assignments" element={<FacultyAssignments />} />
          <Route path="/faculty/assignments/new" element={<AssignmentForm />} />
          <Route path="/faculty/assignments/:id/edit" element={<AssignmentForm />} />
          <Route path="/faculty/assignments/:id/submissions" element={<FacultySubmissions />} />
          <Route path="/faculty/submissions/:id/evaluate" element={<Evaluate />} />
        </Route>
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
