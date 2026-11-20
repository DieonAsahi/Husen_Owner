/**
 * Paginasi editorial tenang 10 per halaman untuk Daftar Karya & Daftar Pameran.
 * Format: "← SEBELUMNYA 1 2 3 SELANJUTNYA →" dan "Menampilkan 1-10 dari N".
 */
export default function AdminPagination({
  page = 1,
  totalPages = 1,
  total = 0,
  pageSize = 10,
  onPageChange,
}) {
  if (total === 0) return null;

  const start = (page - 1) * pageSize + 1;
  const end = Math.min(page * pageSize, total);

  // Hitung nomor halaman yang ditampilkan dengan elipsis jika halaman > 7
  const pages = [];
  for (let i = 1; i <= totalPages; i++) {
    if (
      i === 1 ||
      i === totalPages ||
      (i >= page - 1 && i <= page + 1)
    ) {
      pages.push(i);
    } else if (pages[pages.length - 1] !== 'ellipsis') {
      pages.push('ellipsis');
    }
  }

  return (
    <nav className="admin-pagination" aria-label="Paginasi daftar">
      <p className="admin-pagination__info">
        Menampilkan {start}-{end} dari {total}
      </p>

      <div className="admin-pagination__controls">
        <button
          type="button"
          className="admin-pagination__nav"
          disabled={page <= 1}
          onClick={() => onPageChange(page - 1)}
          aria-label="Halaman sebelumnya"
        >
          ← SEBELUMNYA
        </button>

        <div className="admin-pagination__numbers">
          {pages.map((p, idx) =>
            p === 'ellipsis' ? (
              <span key={`el-${idx}`} className="admin-pagination__ellipsis" aria-hidden="true">
                …
              </span>
            ) : (
              <button
                key={p}
                type="button"
                className={`admin-pagination__num ${p === page ? 'is-active' : ''}`}
                onClick={() => onPageChange(p)}
                aria-current={p === page ? 'page' : undefined}
                aria-label={`Halaman ${p}`}
              >
                {p}
              </button>
            )
          )}
        </div>

        <button
          type="button"
          className="admin-pagination__nav"
          disabled={page >= totalPages}
          onClick={() => onPageChange(page + 1)}
          aria-label="Halaman selanjutnya"
        >
          SELANJUTNYA →
        </button>
      </div>
    </nav>
  );
}

