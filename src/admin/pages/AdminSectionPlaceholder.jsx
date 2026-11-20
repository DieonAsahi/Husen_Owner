import { Link, useSearchParams } from 'react-router-dom';
import { useAdminAuth } from '../context/adminContexts';
import StatusDot from '../components/StatusDot';

export default function AdminSectionPlaceholder({
  sectionTitle,
  ownerOnly = false,
}) {
  const { user } = useAdminAuth();
  const [searchParams] = useSearchParams();
  const editSlug = searchParams.get('edit');
  const isNew = searchParams.get('baru') === '1';

  const isDenied = ownerOnly && user?.role !== 'OWNER';

  if (isDenied) {
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

  return (
    <section className="admin-panel">
      <div className="admin-state-box">
        <StatusDot label="TAHAP PENGEMBANGAN BERIKUTNYA" tone="warning" />
        <h2 className="admin-panel__title">
          {sectionTitle}
          {isNew ? ' — Tambah Baru' : editSlug ? ` — Sunting (${editSlug})` : ''}
        </h2>
        <p className="admin-state-box__msg">
          Kerangka navigasi dan rute untuk modul {sectionTitle} sudah terhubung. Antarmuka pengelolaan isi akan dibangun pada fase CMS selanjutnya.
        </p>
        <Link to="/" className="admin-btn admin-btn--secondary">
          ← Kembali ke Dashboard
        </Link>
      </div>
    </section>
  );
}

