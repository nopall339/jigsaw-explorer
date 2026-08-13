# PROMPT UNTUK CLAUDE CODE

Salin seluruh isi di bawah ini dan berikan ke Claude Code sebagai instruksi awal.

---

Saya ingin membangun **Jigsaw Explorer** — sebuah web app puzzle jigsaw digital gratis
yang bisa dimainkan langsung di browser, dengan fokus fitur *bermain bersama secara
real-time* (mirip mengerjakan puzzle di satu meja lewat video call).

## Tech Stack
- **Next.js 14 (App Router) + TypeScript**
- **Tailwind CSS** untuk styling
- **Canvas API / Konva.js (react-konva)** untuk render & drag potongan puzzle
- **Socket.io** (custom server Node.js terpisah, atau Next.js custom server) untuk sinkronisasi real-time antar pemain dalam satu room
- **Redis (opsional, in-memory Map dulu untuk MVP)** untuk menyimpan state room aktif
- Upload gambar disimpan sementara di server (atau langsung ke object storage jika tersedia, misal S3-compatible) lalu diproses jadi potongan puzzle

## Fitur Utama (urutan prioritas MVP)

1. **Pilih / Upload Gambar**
   - Galeri gambar bawaan (kategori: alam, hewan, kota, dll — pakai gambar placeholder dulu)
   - Upload foto sendiri (jpg/png, max 10MB, validasi tipe & ukuran)
   - Preview sebelum mulai

2. **Pengaturan Kesulitan**
   - Pilihan jumlah potongan: 12, 48, 100, 300, 500 (grid otomatis dihitung dari aspect ratio gambar)
   - Bentuk potongan klasik jigsaw (tab & blank yang saling mengunci) — untuk MVP boleh mulai dari potongan grid persegi sederhana lalu ditingkatkan ke bentuk jigsaw asli

3. **Papan Puzzle Interaktif (Single Player dulu)**
   - Drag & drop potongan dengan mouse/touch
   - Snap otomatis saat potongan mendekati posisi benar (dengan toleransi jarak)
   - Rotasi potongan (opsional, bisa dimatikan di setting)
   - Indikator progres (jumlah potongan terpasang / total)
   - Zoom & pan area kerja
   - Tombol "acak ulang", "lihat gambar referensi kecil di pojok"

4. **Multiplayer Real-Time — "Play with Friends"**
   - Tombol "Buat Room" → generate room ID unik + link undangan (mis. `/room/abc123`)
   - Pemain lain join lewat link, tanpa perlu login/akun
   - Semua pemain melihat pergerakan potongan pemain lain secara real-time (broadcast posisi via WebSocket)
   - Cursor/label nama tiap pemain terlihat di papan (opsional avatar warna acak)
   - Lock potongan yang sedang di-drag pemain lain agar tidak ditarik dua orang sekaligus
   - Chat kecil / reaksi emoji (opsional, nice-to-have)

5. **Layout Ramah untuk Video Call Bersamaan**
   - UI didesain agar nyaman dipakai berdampingan dengan window video call (Zoom/Meet/FaceTime) — area kerja puzzle memenuhi layar, tidak ada elemen yang terlalu ramai di bagian atas layar (biar tidak ketutupan window PiP video call)
   - Responsive: tetap nyaman di layar laptop kecil

6. **Selesai & Berbagi**
   - Layar "Selamat!" dengan waktu pengerjaan saat puzzle selesai
   - Statistik sederhana: waktu, jumlah pemain yang ikut

## Struktur Halaman
- `/` — Landing page: hero, cara kerja, tombol "Mulai Puzzle Baru" & "Main dengan Teman"
- `/create` — Pilih/upload gambar + atur kesulitan → generate room
- `/room/[roomId]` — Papan puzzle utama (single & multiplayer pakai komponen yang sama, beda hanya ada-tidaknya koneksi socket)
- `/api/upload` — endpoint upload gambar
- `/api/rooms` — endpoint create/get metadata room

## Non-Goals untuk MVP (jangan dikerjakan dulu)
- Sistem akun/login
- Leaderboard global
- Native mobile app
- Video call bawaan di dalam app (cukup desain agar nyaman dipakai *berdampingan* dengan app video call eksternal)

## Instruksi Kerja untuk Claude Code
1. Mulai dari struktur folder yang sudah disiapkan di project ini (lihat `README.md`).
2. Setup Next.js + TypeScript + Tailwind terlebih dahulu, pastikan `npm run dev` jalan dengan landing page kosong.
3. Bangun logic pemecahan gambar menjadi grid potongan di `src/lib/puzzle-engine/` dulu (murni logic, testable, tanpa UI) sebelum menyambungkannya ke komponen React.
4. Baru setelah single-player board berfungsi penuh, tambahkan layer Socket.io untuk multiplayer.
5. Jaga agar setiap komponen kecil dan reusable — pisahkan logic canvas rendering dari logic state puzzle.
6. Gunakan TypeScript strict mode, beri type yang jelas untuk `PuzzlePiece`, `PuzzleRoom`, `Player`, dll (lihat draft di `src/types/`).
