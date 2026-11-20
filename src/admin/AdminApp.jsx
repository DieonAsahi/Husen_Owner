import { useEffect } from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import AdminAuthProvider from './components/AdminAuthProvider';
import ToastProvider from './components/ToastProvider';
import ConfirmProvider from './components/ConfirmDialog';
import AdminLayout from './components/AdminLayout';
import AdminLogin from './pages/AdminLogin';
import AdminForgotPassword from './pages/AdminForgotPassword';
import AdminDashboard from './pages/AdminDashboard';
import AdminKaryaList from './pages/AdminKaryaList';
import AdminKaryaForm from './pages/AdminKaryaForm';
import AdminPameranList from './pages/AdminPameranList';
import AdminPameranForm from './pages/AdminPameranForm';
import AdminArtikelList from './pages/AdminArtikelList';
import AdminArtikelForm from './pages/AdminArtikelForm';
import AdminSettingsPage from './pages/AdminSettingsPage';
import AdminUsersPage from './pages/AdminUsersPage';
import AdminLogsPage from './pages/AdminLogsPage';
import AdminReportsPage from './pages/AdminReportsPage';
import { useAdminAuth } from './context/adminContexts';
import './styles/admin.css';

function RequireAdminAuth({ children }) {
  const { isAuthenticated } = useAdminAuth();
  const location = useLocation();

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return children;
}

export default function AdminApp() {
  useEffect(() => {
    const prevTitle = document.title;
    document.title = 'Panel Studio \u2014 Husen Nursidik \u00b7 House of Art';
    return () => {
      document.title = prevTitle;
    };
  }, []);

  return (
    <div className="admin-root">
      <AdminAuthProvider>
        <ToastProvider>
          <ConfirmProvider>
            <Routes>
              <Route path="login" element={<AdminLogin />} />
              <Route path="lupa-kata-sandi" element={<AdminForgotPassword />} />

              <Route
                index
                element={
                  <RequireAdminAuth>
                    <AdminLayout pageTitle="Dashboard">
                      <AdminDashboard />
                    </AdminLayout>
                  </RequireAdminAuth>
                }
              />
              <Route
                path="karya"
                element={
                  <RequireAdminAuth>
                    <AdminLayout pageTitle="Karya">
                      <AdminKaryaList />
                    </AdminLayout>
                  </RequireAdminAuth>
                }
              />
              <Route
                path="karya/baru"
                element={
                  <RequireAdminAuth>
                    <AdminLayout pageTitle="Karya">
                      <AdminKaryaForm />
                    </AdminLayout>
                  </RequireAdminAuth>
                }
              />
              <Route
                path="karya/:slug"
                element={
                  <RequireAdminAuth>
                    <AdminLayout pageTitle="Karya">
                      <AdminKaryaForm />
                    </AdminLayout>
                  </RequireAdminAuth>
                }
              />
              <Route
                path="pameran"
                element={
                  <RequireAdminAuth>
                    <AdminLayout pageTitle="Pameran">
                      <AdminPameranList />
                    </AdminLayout>
                  </RequireAdminAuth>
                }
              />
              <Route
                path="pameran/baru"
                element={
                  <RequireAdminAuth>
                    <AdminLayout pageTitle="Pameran">
                      <AdminPameranForm />
                    </AdminLayout>
                  </RequireAdminAuth>
                }
              />
              <Route
                path="pameran/:slug"
                element={
                  <RequireAdminAuth>
                    <AdminLayout pageTitle="Pameran">
                      <AdminPameranForm />
                    </AdminLayout>
                  </RequireAdminAuth>
                }
              />
              <Route
                path="artikel"
                element={
                  <RequireAdminAuth>
                    <AdminLayout pageTitle="Artikel">
                      <AdminArtikelList />
                    </AdminLayout>
                  </RequireAdminAuth>
                }
              />
              <Route
                path="artikel/baru"
                element={
                  <RequireAdminAuth>
                    <AdminLayout pageTitle="Artikel">
                      <AdminArtikelForm />
                    </AdminLayout>
                  </RequireAdminAuth>
                }
              />
              <Route
                path="artikel/:slug"
                element={
                  <RequireAdminAuth>
                    <AdminLayout pageTitle="Artikel">
                      <AdminArtikelForm />
                    </AdminLayout>
                  </RequireAdminAuth>
                }
              />
              <Route
                path="pengaturan"
                element={
                  <RequireAdminAuth>
                    <AdminLayout pageTitle="Pengaturan">
                      <AdminSettingsPage />
                    </AdminLayout>
                  </RequireAdminAuth>
                }
              />
              <Route
                path="owner/pengguna"
                element={
                  <RequireAdminAuth>
                    <AdminLayout pageTitle="Pengguna">
                      <AdminUsersPage />
                    </AdminLayout>
                  </RequireAdminAuth>
                }
              />
              <Route
                path="owner/log"
                element={
                  <RequireAdminAuth>
                    <AdminLayout pageTitle="Aktivitas">
                      <AdminLogsPage />
                    </AdminLayout>
                  </RequireAdminAuth>
                }
              />
              <Route
                path="owner/laporan"
                element={
                  <RequireAdminAuth>
                    <AdminLayout pageTitle="Laporan">
                      <AdminReportsPage />
                    </AdminLayout>
                  </RequireAdminAuth>
                }
              />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
        </ConfirmProvider>
      </ToastProvider>
    </AdminAuthProvider>
  </div>
  );
}
