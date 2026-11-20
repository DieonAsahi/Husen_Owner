export const MAX_IMAGE_BYTES = 20 * 1024 * 1024;
const ALLOWED_MIME = new Set(['image/jpeg', 'image/png', 'image/webp']);
const ALLOWED_EXT = /\.(jpe?g|png|webp)$/i;

/**
 * Validasi tipe (JPG/PNG/WebP) dan ukuran maksimum 20 MB untuk berkas gambar studio.
 * @returns {string} Pesan kesalahan Bahasa Indonesia, atau string kosong bila valid.
 */
export function validateImageFile(file) {
  if (!file) return 'Berkas gambar tidak ditemukan.';
  const validType = ALLOWED_MIME.has(file.type) || ALLOWED_EXT.test(file.name);
  if (!validType) {
    return `${file.name}: format berkas tidak didukung. Gunakan JPG, PNG, atau WebP.`;
  }
  if (file.size > MAX_IMAGE_BYTES) {
    return `${file.name}: ukuran melebihi batas maksimum 20 MB.`;
  }
  return '';
}

/**
 * Membaca berkas gambar lokal menjadi data URL sekaligus mengambil dimensi piksel asli.
 */
export function readImageFileWithDimensions(file, onProgress = () => {}) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onprogress = (evt) => {
      if (evt.lengthComputable) {
        const pct = Math.min(85, Math.round((evt.loaded / evt.total) * 85));
        onProgress(pct);
      }
    };
    reader.onerror = () => reject(new Error(`Gagal membaca berkas ${file.name}.`));
    reader.onload = () => {
      const dataUrl = reader.result;
      onProgress(90);
      const img = new Image();
      img.onload = () => {
        onProgress(100);
        resolve({
          id: `up-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
          url: dataUrl,
          width: img.naturalWidth || 0,
          height: img.naturalHeight || 0,
          alt: '',
          caption: '',
        });
      };
      img.onerror = () => {
        onProgress(100);
        resolve({
          id: `up-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
          url: dataUrl,
          width: 0,
          height: 0,
          alt: '',
          caption: '',
        });
      };
      img.src = dataUrl;
    };
    reader.readAsDataURL(file);
  });
}

