# Status Proyek Husen Admin

## Arsitektur

Proyek Vite + React 19 terpisah. Antarmuka admin berada di `src/admin/`; router independen memakai `BrowserRouter`. Data demonstrasi dan akun mock tanpa kata sandi disediakan hanya di development dari `src/dev-seed/`; login lokal mock menerima input kata sandi nonkosong. Belum ada koneksi autentikasi atau CRUD Supabase.

Sumber kebenaran skema dan migrasi dikelola dari proyek admin di `supabase/migrations/`.

## Rute

- `/login`, `/lupa-kata-sandi`
- `/` dasbor
- `/karya`, `/karya/baru`, `/karya/:slug`
- `/pameran`, `/pameran/baru`, `/pameran/:slug`
- `/artikel`, `/artikel/baru`, `/artikel/:slug`
- `/pengaturan`
- `/owner/pengguna`, `/owner/log`, `/owner/laporan` (owner saja di UI)

Pembatasan peran pada UI hanya petunjuk pengalaman pengguna, bukan batas keamanan. Terapkan otorisasi pada Supabase Auth, kebijakan RLS, dan server.

## Perintah

- `npm install`
- `npm run dev`
- `npm run lint`
- `npm run build`
- `npm run preview`

## Pekerjaan tersisa

1. Integrasi Supabase Auth.
2. CRUD konten dan pengaturan melalui Supabase.
3. Unggah foto ke storage privat.
4. Alur undangan pengguna.

Pratinjau draft melalui komponen publik **tidak** termasuk proyek admin. Tombol “Pratinjau” tetap menggunakan pratinjau langsung di form; tautan pratinjau bertoken ke situs ditunda. Tidak ada salinan komponen publik di proyek ini.
