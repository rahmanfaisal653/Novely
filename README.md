# Novely

Asisten cerdas perancang **Blueprint Proposal Penelitian** (bisnis & manajemen) dengan metodologi **PLS-SEM** standar publikasi internasional bereputasi (Scopus Q1/Q2).

Dibangun dengan Vite + React 19 + TypeScript + Tailwind CSS v4, dengan backend proxy Node.js (Express) untuk AI provider & Scopus.

## Fitur

- **Generate Blueprint Proposal** — masukkan level studi (S1/S2/S3), peminatan, dan konteks penelitian → dapatkan blueprint lengkap: judul, grand theory, penelitian terdahulu, research gaps, research questions, diagram path model (Mermaid), metodologi PLS-SEM, indikator & kuesioner, daftar pustaka.
- **Referensi literatur Scopus** — pencarian otomatis ke Elsevier Scopus API berdasarkan peminatan (opsional, butuh API key).
- **Bring Your Own AI Provider** — setiap user bisa memakai provider AI-nya sendiri (OpenAI-compatible) lewat **Pengaturan AI**: base URL + API key + pilih model. Bisa juga memilih tampilan Scopus (Standard / Complete).
- **Fallback Gemini** — kalau user belum mengisi Pengaturan AI, aplikasi tetap berjalan menggunakan Gemini (via `GEMINI_API_KEY` di environment).
- **Cetak Proposal** — render blueprint ke PDF via `window.print()`.

## Arsitektur

```
Browser (React SPA)
  ├── /api/chat  ──►  server.js (Express proxy, port 4001)  ──►  AI provider (OpenAI-compatible)
  └── /api/models ─►  server.js (Express proxy, port 4001)  ──►  AI provider /models
  └── Scopus API (langsung dari browser via Elsevier)
```

- **Frontend**: Vite + React + Tailwind. Settings user disimpan di `localStorage` (key `novely_ai_settings`), tidak pernah dikirim ke server.
- **Backend proxy** (`server.js`): meneruskan request AI ke provider yang dikonfigurasi user (untuk menghindari CORS & menjaga key tetap di sisi client). Juga menyediakan endpoint `/api/models` untuk memuat daftar model.
- **Scopus**: dipanggil langsung dari browser ke `api.elsevier.com` (CORS diizinkan Elsevier).

## Setup Lokal

**Prerequisites:** Node.js 18+

1. Install dependencies:
   ```bash
   npm install
   ```

2. Konfigurasi environment — salin `.env.example` menjadi `.env.local` (opsional, hanya untuk fallback Gemini):
   ```
   GEMINI_API_KEY="<API key Gemini kamu>"
   ```
   > Gemini hanya dipakai sebagai **fallback** ketika user belum mengisi Pengaturan AI. Tanpa key ini, aplikasi tetap berjalan — user tinggal isi Pengaturan AI di UI.

3. Jalankan backend proxy:
   ```bash
   npm run backend
   # atau langsung: node server.js
   ```
   Backend berjalan di `http://localhost:4001`.

4. Jalankan frontend (di terminal terpisah):
   ```bash
   npm run dev
   ```
   Buka http://localhost:3000

   Atau langsung dua-duanya:
   ```bash
   npm run dev:all
   ```

## Pengaturan AI (di dalam aplikasi)

Tombol **Pengaturan AI** di header aplikasi membuka modal:

- **Base URL Provider** — URL OpenAI-compatible, mis. `https://api.openai.com/v1`, `https://api.groq.com/openai/v1`, `http://localhost:11434/v1` (Ollama).
- **API Key** — key milik user sendiri (disimpan di localStorage).
- **Muat Model** — memuat daftar model dari provider; pilih model dari dropdown.
- **API Key Scopus (Opsional)** — key dari https://dev.elsevier.com untuk referensi literatur.
- **View Scopus** — `Standard` (gratis, semua akun) atau `Complete` (butuh akses premium/institusi).

Kalau user mengosongkan semua, aplikasi memakai fallback Gemini.

## Environment Variables

| Variable | Wajib? | Deskripsi |
|----------|--------|-----------|
| `GEMINI_API_KEY` | Opsional | Fallback Gemini ketika user belum mengisi Pengaturan AI |
| `SCOPUS_API_KEY` | Opsional | Default key Scopus (bisa juga diisi user di Pengaturan AI) |
| `APP_URL` | Opsional | URL publik aplikasi (untuk referensi diri) |

## Scripts

| Script | Fungsi |
|--------|--------|
| `npm run dev` | Jalankan frontend Vite (port 3000) |
| `npm run backend` | Jalankan backend proxy Express (port 4001) |
| `npm run dev:all` | Jalankan frontend + backend sekaligus |
| `npm run build` | Build produksi ke `dist/` |
| `npm run preview` | Preview hasil build |

## Deploy

1. Build: `npm run build`
2. Jalankan backend + sajikan `dist/` dengan Nginx (lihat pola reverse-proxy standar: `root` ke `dist/`, `location /api/` → `http://127.0.0.1:4001`).
3. Pastikan `server.js` berjalan (PM2 / systemd / screen).
4. Atur env `GEMINI_API_KEY` di environment produksi untuk fallback Gemini.
