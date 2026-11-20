import { useState, useRef } from 'react';
import { useConfirm, useToast } from '../context/adminContexts';
import {
  validateImageFile,
  readImageFileWithDimensions,
} from '../services/adminImageHelper';
import {
  IconUpload,
  IconStar,
  IconGrip,
  IconTrash,
  IconChevronLeft,
  IconChevronRight,
} from './AdminIcons';

function parseFocalPoint(focalStr) {
  const match = String(focalStr || '50% 35%').match(/(\d+(?:\.\d+)?)%\s+(\d+(?:\.\d+)?)%/);
  if (!match) return { x: 50, y: 35 };
  return {
    x: Math.max(0, Math.min(100, Math.round(Number(match[1])))),
    y: Math.max(0, Math.min(100, Math.round(Number(match[2])))),
  };
}

export default function AdminPhotoManager({
  photos = [],
  onChange,
  enableFocalPoint = false,
  focalPoint = '50% 35%',
  onFocalPointChange,
  showAltValidation = false,
}) {
  const confirm = useConfirm();
  const { showToast } = useToast();
  const fileInputRef = useRef(null);

  const [isDragOver, setIsDragOver] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const [uploads, setUploads] = useState([]); // { id, name, progress }
  const [dragIndex, setDragIndex] = useState(null);

  const processFiles = async (fileList) => {
    setUploadError('');
    const files = Array.from(fileList || []);
    if (files.length === 0) return;

    const validFiles = [];
    for (const file of files) {
      const errMsg = validateImageFile(file);
      if (errMsg) {
        setUploadError(errMsg);
        continue;
      }
      validFiles.push(file);
    }

    if (validFiles.length === 0) return;

    const createdPhotos = [];
    for (const file of validFiles) {
      const upId = `prog-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
      setUploads((prev) => [...prev, { id: upId, name: file.name, progress: 15 }]);

      try {
        await new Promise((r) => window.setTimeout(r, 120));
        const loaded = await readImageFileWithDimensions(file, (pct) => {
          setUploads((prev) =>
            prev.map((u) => (u.id === upId ? { ...u, progress: pct } : u))
          );
        });
        createdPhotos.push(loaded);
      } catch (err) {
        setUploadError(err.message);
      } finally {
        window.setTimeout(() => {
          setUploads((prev) => prev.filter((u) => u.id !== upId));
        }, 450);
      }
    }

    if (createdPhotos.length > 0) {
      const next = [...photos, ...createdPhotos].map((img, i) => ({
        ...img,
        isCover: i === 0,
      }));
      onChange(next);
      showToast({
        message: `${createdPhotos.length} foto berhasil ditambahkan.`,
        tone: 'success',
      });
    }
  };

  const handleSetMain = (idx) => {
    if (idx === 0) return;
    const next = [...photos];
    const [picked] = next.splice(idx, 1);
    next.unshift(picked);
    onChange(next.map((img, i) => ({ ...img, isCover: i === 0 })));
    showToast({ message: 'Foto utama diperbarui.', tone: 'success' });
  };

  const handleMove = (fromIdx, toIdx) => {
    if (toIdx < 0 || toIdx >= photos.length || fromIdx === toIdx) return;
    const next = [...photos];
    const [moved] = next.splice(fromIdx, 1);
    next.splice(toIdx, 0, moved);
    onChange(next.map((img, i) => ({ ...img, isCover: i === 0 })));
  };

  const handleDelete = async (idx) => {
    const agreed = await confirm({
      title: 'Hapus foto ini?',
      message: 'Foto akan dihapus dari daftar unggahan. Anda dapat mengunggah ulang kapan saja.',
      confirmLabel: 'Hapus foto',
      cancelLabel: 'Batal',
      destructive: true,
    });
    if (!agreed) return;
    const next = photos.filter((_, i) => i !== idx).map((img, i) => ({ ...img, isCover: i === 0 }));
    onChange(next);
    showToast({ message: 'Foto dihapus dari daftar.', tone: 'success' });
  };

  const handleUpdateField = (idx, field, val) => {
    const next = photos.map((img, i) => (i === idx ? { ...img, [field]: val } : img));
    onChange(next);
  };

  const handleFocalClick = (e) => {
    if (!onFocalPointChange) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = Math.max(0, Math.min(100, Math.round(((e.clientX - rect.left) / rect.width) * 100)));
    const y = Math.max(0, Math.min(100, Math.round(((e.clientY - rect.top) / rect.height) * 100)));
    onFocalPointChange(`${x}% ${y}%`);
  };

  const parsedFocal = parseFocalPoint(focalPoint);
  const coverPhoto = photos[0];

  return (
    <section className="admin-panel admin-photo-section" aria-labelledby="sec-photos">
      <div className="admin-panel__head">
        <h3 id="sec-photos" className="admin-panel__title">
          Foto ({photos.length})
        </h3>
      </div>

      <div className="admin-photo-section__body">
        {/* Dropzone Area Seret-Lepas */}
        <div
          role="button"
          tabIndex={0}
          className={`admin-dropzone ${isDragOver ? 'is-dragover' : ''}`}
          onClick={() => fileInputRef.current?.click()}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              fileInputRef.current?.click();
            }
          }}
          onDragOver={(e) => {
            e.preventDefault();
            setIsDragOver(true);
          }}
          onDragLeave={() => setIsDragOver(false)}
          onDrop={(e) => {
            e.preventDefault();
            setIsDragOver(false);
            processFiles(e.dataTransfer.files);
          }}
          aria-label="Unggah foto: seret foto ke sini atau pilih berkas"
        >
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            multiple
            className="admin-sr-only"
            onChange={(e) => {
              processFiles(e.target.files);
              e.target.value = '';
            }}
          />
          <IconUpload size={22} />
          <p className="admin-dropzone__text">
            Seret foto ke sini atau pilih berkas. JPG, PNG, WebP, maksimum 20 MB, disarankan sisi terpanjang minimal 2000 px
          </p>
        </div>

        {uploadError && (
          <p className="admin-field__error" role="alert">
            {uploadError}
          </p>
        )}

        {/* Bilah Kemajuan Per Unggahan */}
        {uploads.length > 0 && (
          <ul className="admin-upload-list" aria-label="Kemajuan unggahan">
            {uploads.map((u) => (
              <li key={u.id} className="admin-upload-item">
                <div className="admin-upload-item__top">
                  <span>{u.name}</span>
                  <span>{u.progress}%</span>
                </div>
                <div className="admin-progress-track">
                  <div
                    className="admin-progress-fill"
                    style={{ width: `${u.progress}%` }}
                  />
                </div>
              </li>
            ))}
          </ul>
        )}

        {/* Grid Foto yang Dapat Diurutkan */}
        {photos.length === 0 ? (
          <div className="admin-photo-empty">
            <p>Belum ada foto terpasang. Unggah minimal satu foto untuk ditampilkan pada situs.</p>
          </div>
        ) : (
          <div className="admin-photo-grid">
            {photos.map((photo, idx) => {
              const longestSide = Math.max(Number(photo.width) || 0, Number(photo.height) || 0);
              const isLowRes = longestSide > 0 && longestSide < 1200;
              const altMissing = !String(photo.alt || '').trim();

              return (
                <article
                  key={photo.id || idx}
                  className={`admin-photo-card ${idx === 0 ? 'is-cover' : ''} ${dragIndex === idx ? 'is-dragging' : ''}`}
                  draggable
                  onDragStart={() => setDragIndex(idx)}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={() => {
                    if (dragIndex !== null && dragIndex !== idx) {
                      handleMove(dragIndex, idx);
                    }
                    setDragIndex(null);
                  }}
                  onDragEnd={() => setDragIndex(null)}
                >
                  {/* Baris Atas: Gagang Geser + Lencana UTAMA + Bintang + Pindah Urutan */}
                  <div className="admin-photo-card__bar">
                    <div className="admin-photo-card__handle" title="Seret untuk mengurutkan">
                      <IconGrip size={16} />
                      {idx === 0 && <span className="admin-photo-badge">UTAMA</span>}
                    </div>

                    <div className="admin-photo-card__controls">
                      <button
                        type="button"
                        className="admin-icon-btn"
                        disabled={idx === 0}
                        onClick={() => handleMove(idx, idx - 1)}
                        aria-label={`Geser foto ${idx + 1} ke posisi sebelumnya`}
                        title="Geser maju"
                      >
                        <IconChevronLeft size={15} />
                      </button>
                      <button
                        type="button"
                        className="admin-icon-btn"
                        disabled={idx === photos.length - 1}
                        onClick={() => handleMove(idx, idx + 1)}
                        aria-label={`Geser foto ${idx + 1} ke posisi berikutnya`}
                        title="Geser mundur"
                      >
                        <IconChevronRight size={15} />
                      </button>
                      <button
                        type="button"
                        className={`admin-icon-btn admin-star-btn ${idx === 0 ? 'is-active' : ''}`}
                        onClick={() => handleSetMain(idx)}
                        aria-label={idx === 0 ? 'Foto utama saat ini' : 'Jadikan foto utama'}
                        aria-pressed={idx === 0}
                        title={idx === 0 ? 'Foto utama' : 'Jadikan foto utama'}
                      >
                        <IconStar filled={idx === 0} size={16} />
                      </button>
                      <button
                        type="button"
                        className="admin-icon-btn admin-icon-btn--danger"
                        onClick={() => handleDelete(idx)}
                        aria-label={`Hapus foto ${idx + 1}`}
                        title="Hapus foto"
                      >
                        <IconTrash size={16} />
                      </button>
                    </div>
                  </div>

                  {/* Preview Gambar + Info Resolusi */}
                  <div className="admin-photo-card__preview">
                    <img
                      src={photo.url}
                      alt={photo.alt || `Pratinjau foto ${idx + 1}`}
                      className="admin-photo-card__img"
                    />
                    {photo.width > 0 && (
                      <span className="admin-photo-card__dims">
                        {photo.width} × {photo.height} px
                      </span>
                    )}
                  </div>

                  {isLowRes && (
                    <p className="admin-photo-card__warn" role="status">
                      <span className="admin-status__dot admin-dot--warning" aria-hidden="true" />
                      Resolusi rendah, zoom akan buram
                    </p>
                  )}

                  {/* Kolom Teks Alternatif (Wajib) & Keterangan (Opsional) */}
                  <div className="admin-photo-card__fields">
                    <div className="admin-field">
                      <label htmlFor={`photo-alt-${photo.id || idx}`} className="admin-label">
                        Teks alternatif (wajib)
                      </label>
                      <input
                        id={`photo-alt-${photo.id || idx}`}
                        type="text"
                        className={`admin-input ${altMissing && showAltValidation ? 'is-error' : ''}`}
                        value={photo.alt || ''}
                        onChange={(e) => handleUpdateField(idx, 'alt', e.target.value)}
                        placeholder="Deskripsi singkat untuk pembaca layar"
                        aria-invalid={altMissing}
                      />
                      {altMissing && (
                        <p className={showAltValidation ? 'admin-field__error' : 'admin-field__warning'} role="status">
                          {showAltValidation
                            ? 'Teks alternatif wajib diisi.'
                            : 'Teks alternatif masih kosong.'}
                        </p>
                      )}
                    </div>

                    <div className="admin-field">
                      <label htmlFor={`photo-cap-${photo.id || idx}`} className="admin-label">
                        Keterangan (opsional)
                      </label>
                      <input
                        id={`photo-cap-${photo.id || idx}`}
                        type="text"
                        className="admin-input"
                        value={photo.caption || ''}
                        onChange={(e) => handleUpdateField(idx, 'caption', e.target.value)}
                        placeholder="Keterangan tambahan di bawah foto viewer"
                      />
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}

        {/* Pilihan Titik Fokus (Khusus Form Pameran) */}
        {enableFocalPoint && coverPhoto && (
          <div className="admin-focal-panel">
            <div className="admin-focal-panel__head">
              <div>
                <h4 className="admin-focal-panel__title">Titik Fokus Potongan Kartu</h4>
                <p className="admin-focal-panel__desc">
                  Klik pada foto untuk menentukan titik pusat potongan kartu 4:3 ({focalPoint}).
                </p>
              </div>
              <button
                type="button"
                className="admin-btn admin-btn--secondary admin-btn--sm"
                onClick={() => onFocalPointChange?.('50% 35%')}
              >
                Reset bawaan
              </button>
            </div>

            <div className="admin-focal-workspace">
              <div
                className="admin-focal-stage"
                onClick={handleFocalClick}
                role="button"
                tabIndex={0}
                aria-label={`Atur titik fokus potongan kartu. Posisi saat ini ${focalPoint}`}
                onKeyDown={(e) => {
                  if (!onFocalPointChange) return;
                  if (e.key === 'ArrowLeft') onFocalPointChange(`${Math.max(0, parsedFocal.x - 5)}% ${parsedFocal.y}%`);
                  if (e.key === 'ArrowRight') onFocalPointChange(`${Math.min(100, parsedFocal.x + 5)}% ${parsedFocal.y}%`);
                  if (e.key === 'ArrowUp') onFocalPointChange(`${parsedFocal.x}% ${Math.max(0, parsedFocal.y - 5)}%`);
                  if (e.key === 'ArrowDown') onFocalPointChange(`${parsedFocal.x}% ${Math.min(100, parsedFocal.y + 5)}%`);
                }}
              >
                <img
                  src={coverPhoto.url}
                  alt={coverPhoto.alt || 'Pilih titik fokus foto utama'}
                  className="admin-focal-stage__img"
                />
                <span
                  className="admin-focal-reticle"
                  style={{ left: `${parsedFocal.x}%`, top: `${parsedFocal.y}%` }}
                  aria-hidden="true"
                />
              </div>

              <div className="admin-focal-preview-box">
                <span className="admin-label">Pratinjau potongan kartu (4:3)</span>
                <div className="admin-focal-card-crop">
                  <img
                    src={coverPhoto.url}
                    alt=""
                    style={{ objectPosition: focalPoint }}
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Catatan kecil */}
        <p className="admin-photo-footnote">
          File asli disimpan privat; di situs tampil versi berwatermark.
        </p>
      </div>
    </section>
  );
}

