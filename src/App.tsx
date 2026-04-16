import { useEffect, useState } from 'react';
import { Link, Navigate, Route, Routes } from 'react-router-dom';
import AuthGate from './components/AuthGate';
import LoginPage from './pages/LoginPage';
import TaskPage from './pages/TaskPage';
import AdminPage from './pages/AdminPage';
import AdminCategoriesPage from './pages/AdminCategoriesPage';
import { getMyProfile } from './lib/auth';

function AdminRoute({ children }: { children: JSX.Element }) {
  const [role, setRole] = useState<string>('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getMyProfile().then((profile) => {
      setRole(profile?.role ?? 'worker');
      setLoading(false);
    });
  }, []);

  if (loading) return <p>Loading...</p>;
  if (role !== 'admin') return <Navigate to="/" replace />;
  return children;
}

export default function App() {
  return (
    <>
      <nav><Link to="/">Tasks</Link> | <Link to="/admin">Admin Review</Link> | <Link to="/admin/categories">Categories</Link></nav>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/" element={<AuthGate><TaskPage /></AuthGate>} />
        <Route path="/admin" element={<AuthGate><AdminRoute><AdminPage /></AdminRoute></AuthGate>} />
        <Route path="/admin/categories" element={<AuthGate><AdminRoute><AdminCategoriesPage /></AdminRoute></AuthGate>} />
      </Routes>
    </>
  );
}
