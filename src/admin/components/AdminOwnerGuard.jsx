import { Link } from 'react-router-dom';
import { useAdminAuth } from '../context/adminContexts';
import StatusDot from './StatusDot';

// Hak akses di UI hanyalah petunjuk UX, bukan batas keamanan; RLS basis data adalah penjaga sebenarnya.
export default function AdminOwnerGuard({ sectionTitle, children }) {
  const { user } = useAdminAuth();

  if (user?.role !== 'OWNER') {
    return (
      <section className="admin-panel admin-panel--error" role="alert">
        <div className="admin-state-box">
          <StatusDot label="AKSES KHUSUS OWNER" tone="danger" />
          <h2 className="admin-panel__title">Halaman Tidak Tersedia untuk Peran Admin</h2>
          <p className="admin-state-box__msg">
            Menu {sectionTitle} hanya dapat diakses oleh akun dengan peran Owner.
          </p>
          <Link to="/" className="admin-btn admin-btn--secondary">
            ← Kembali ke Dashboard
          </Link>
        </div>
      </section>
    );
  }

  return children;
}
