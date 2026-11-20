import { Link } from 'react-router-dom';

/**
 * Halaman netral saat akses panel belum tersedia untuk lingkungan ini.
 * Tidak memuat atau merender formulir login maupun kode kredensial studio.
 */
export default function AdminDisabledNotice() {
  return (
    <div
      style={{
        minHeight: '100dvh',
        backgroundColor: '#EFE8D8',
        color: '#171513',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px 16px',
        fontFamily: "var(--sans, 'Inter', system-ui, -apple-system, sans-serif)",
        boxSizing: 'border-box',
      }}
    >
      <main
        style={{
          width: '100%',
          maxWidth: '460px',
          backgroundColor: '#F7F2E7',
          border: '1px solid #D9CFBA',
          borderRadius: '3px',
          padding: '32px 28px',
        }}
      >
        <p
          style={{
            margin: '0 0 8px',
            fontSize: '11px',
            fontWeight: 600,
            letterSpacing: '0.14em',
            textTransform: 'uppercase',
            color: '#9C6C28',
          }}
        >
          Husen Nursidik — House of Art
        </p>
        <h1
          style={{
            margin: '0 0 12px',
            fontFamily: "var(--display, 'Instrument Serif', Georgia, serif)",
            fontSize: '30px',
            fontWeight: 400,
            lineHeight: 1.15,
            color: '#171513',
          }}
        >
          Panel admin belum diaktifkan
        </h1>
        <p
          style={{
            margin: '0 0 24px',
            fontSize: '14px',
            lineHeight: 1.55,
            color: '#5F574C',
          }}
        >
          Akses pengelolaan konten pada jalur ini belum diaktifkan untuk lingkungan ini.
        </p>
        <Link
          to="/"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            minHeight: '44px',
            padding: '0 18px',
            backgroundColor: '#171513',
            color: '#F7F2E7',
            borderRadius: '3px',
            fontSize: '13px',
            fontWeight: 600,
            textDecoration: 'none',
          }}
        >
          ← Kembali ke Beranda
        </Link>
      </main>
    </div>
  );
}

