import { Routes, Route, Navigate } from 'react-router-dom';
import ParentLogin from './pages/ParentLogin';
import ParentDashboard from './pages/ParentDashboard';
import StudentLogin from './pages/StudentLogin';
import StudentDashboard from './pages/StudentDashboard';
import TakeExam from './pages/TakeExam';

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/parent" replace />} />
      <Route path="/parent" element={<ParentLogin />} />
      <Route path="/parent/dashboard" element={<ParentDashboard />} />
      <Route path="/student" element={<StudentLogin />} />
      <Route path="/student/dashboard" element={<StudentDashboard />} />
      <Route path="/take-exam/:examId" element={<TakeExam />} />
    </Routes>
  );
}
