/**
 * StatusDot — Indikator status arsip tenang: titik berwarna + teks kecil huruf kapital.
 * Bukan badge/pill besar berwarna.
 * Tone: 'success' (#41603A), 'danger' (#8C3B22), 'warning' (#9C6C28), 'neutral' (#5F574C)
 */
export default function StatusDot({ label, tone = 'neutral' }) {
  return (
    <span className={`admin-status admin-status--${tone}`}>
      <span className="admin-status__dot" aria-hidden="true" />
      <span className="admin-status__text">{label}</span>
    </span>
  );
}

