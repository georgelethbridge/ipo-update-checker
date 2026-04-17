import { useEffect, useState } from 'react';
import { Link, Navigate, Route, Routes } from 'react-router-dom';
import AuthGate from './components/AuthGate';
import LoginPage from './pages/LoginPage';
import TaskPage from './pages/TaskPage';
import AdminPage from './pages/AdminPage';
import AdminCategoriesPage from './pages/AdminCategoriesPage';
import { getMyProfile } from './lib/auth';
import AdminDashboardPage from './pages/AdminDashboardPage';
import AdminSitesPage from './pages/AdminSitesPage';
import AdminUsersPage from './pages/AdminUsersPage';
import AdminAuditPage from './pages/AdminAuditPage';

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

function AppNav() {
  const [role, setRole] = useState<string>('worker');

  useEffect(() => {
    getMyProfile().then((profile) => setRole(profile?.role ?? 'worker'));
  }, []);

  return (
    <nav>
      <Link to="/">Tasks</Link>
      {role === 'admin' && (
        <>
          <Link to="/admin">Admin options</Link>
          <Link to="/admin/reviews">Submission review</Link>
          <Link to="/admin/categories">Categories</Link>
        </>
      )}
    </nav>
  );
}

export default function App() {
  return (
    <>
      <AppNav />
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route
          path="/"
          element={
            <AuthGate>
              <TaskPage />
            </AuthGate>
          }
        />
        <Route
          path="/admin"
          element={
            <AuthGate>
              <AdminRoute>
                <AdminDashboardPage />
              </AdminRoute>
            </AuthGate>
          }
        />
        <Route
          path="/admin/reviews"
          element={
            <AuthGate>
              <AdminRoute>
                <AdminPage />
              </AdminRoute>
            </AuthGate>
          }
        />
        <Route
          path="/admin/categories"
          element={
            <AuthGate>
              <AdminRoute>
                <AdminCategoriesPage />
              </AdminRoute>
            </AuthGate>
          }
        />
        <Route
          path="/admin/sites"
          element={
            <AuthGate>
              <AdminRoute>
                <AdminSitesPage />
              </AdminRoute>
            </AuthGate>
          }
        />
        <Route
          path="/admin/users"
          element={
            <AuthGate>
              <AdminRoute>
                <AdminUsersPage />
              </AdminRoute>
            </AuthGate>
          }
        />
        <Route
          path="/admin/audit"
          element={
            <AuthGate>
              <AdminRoute>
                <AdminAuditPage />
              </AdminRoute>
            </AuthGate>
          }
        />
      </Routes>
    </>
  );
}
