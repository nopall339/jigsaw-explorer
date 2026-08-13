# 🚀 Deployment Guide - Jigsaw Explorer

## 📋 Status Project

✅ **SELESAI** - Semua komponen utama sudah diimplementasikan dan typecheck berhasil!

## 🎯 Fitur yang Sudah Lengkap

### Backend & Real-time
- ✅ Socket.io server dengan Next.js custom server
- ✅ Room management (create, join, leave)
- ✅ Real-time piece synchronization
- ✅ Piece locking mechanism (anti-conflict)
- ✅ Chat & reactions system
- ✅ Auto cleanup inactive rooms

### Frontend
- ✅ Landing page
- ✅ Create puzzle page (galeri + upload)
- ✅ Room page dengan multiplayer canvas
- ✅ Drag & drop pieces dengan Konva
- ✅ Progress tracking
- ✅ Reference image toggle
- ✅ Completion detection & modal

### Hooks
- ✅ `usePuzzleState` - Local puzzle state management
- ✅ `useRoomSocket` - WebSocket connection & events
- ✅ `usePieceSprites` - Image slicing & sprite rendering

## 🏃 Cara Menjalankan Lokal

### 1. Install Dependencies
```bash
cd e:/project]/jigsaw-explorer
npm install
```

### 2. Development Mode
```bash
npm run dev
```
Server akan berjalan di: **http://localhost:3000**

### 3. Production Build
```bash
npm run build
npm start
```

## 🌐 Deploy ke Internet

### Opsi 1: Ngrok (Testing Cepat)

**Install Ngrok:**
```bash
npm install -g ngrok
```

**Jalankan:**
```bash
# Terminal 1
npm run dev

# Terminal 2
ngrok http 3000
```

Salin URL dari ngrok (contoh: `https://abc123.ngrok-free.app`) dan bagikan!

**Kelebihan:**
- ✅ Instant, tidak perlu konfigurasi
- ✅ HTTPS otomatis
- ✅ Gratis

**Kekurangan:**
- ❌ URL berubah setiap restart
- ❌ Tidak cocok untuk production

---

### Opsi 2: Railway (Recommended untuk Production)

**Kenapa Railway?**
- ✅ Support custom Node.js server (Socket.io)
- ✅ Auto SSL/HTTPS
- ✅ PostgreSQL/Redis jika butuh database
- ✅ Deployment otomatis dari GitHub
- ✅ Free tier tersedia

**Step-by-step:**

1. **Push ke GitHub:**
```bash
git init
git add .
git commit -m "Initial commit"
git remote add origin https://github.com/username/jigsaw-explorer.git
git push -u origin main
```

2. **Deploy ke Railway:**
   - Buka https://railway.app
   - Login dengan GitHub
   - Klik "New Project" → "Deploy from GitHub repo"
   - Pilih repository `jigsaw-explorer`
   - Railway akan auto-detect Next.js dan deploy!

3. **Environment Variables:**
   - `NODE_ENV=production`
   - `PORT=3000` (optional, Railway auto-assign)

4. **Custom Domain (Optional):**
   - Settings → Domains → Add custom domain

**URL Railway:** `https://your-app.railway.app`

---

### Opsi 3: Render

**Step-by-step:**

1. **Push ke GitHub** (sama seperti Railway)

2. **Deploy ke Render:**
   - Buka https://render.com
   - New → Web Service
   - Connect repository
   - Build Command: `npm install && npm run build`
   - Start Command: `npm start`
   - Instance Type: Free

3. **Environment Variables:**
   - `NODE_ENV=production`

---

### Opsi 4: Vercel (Perlu Modifikasi)

⚠️ **PERHATIAN:** Vercel tidak support custom Node.js server secara native.

**Solusi:**
1. Deploy frontend ke Vercel
2. Deploy Socket.io server terpisah ke Railway/Render
3. Update `NEXT_PUBLIC_SOCKET_URL` environment variable

---

## 📦 File Penting untuk Deploy

### `package.json` - Scripts
```json
{
  "scripts": {
    "dev": "tsx server/socketServer.ts",
    "build": "next build",
    "start": "cross-env NODE_ENV=production tsx server/socketServer.ts"
  }
}
```

### `server/socketServer.ts` - Custom Server
Menjalankan Next.js + Socket.io dalam satu server.

### Environment Variables
```env
NODE_ENV=production
PORT=3000
NEXT_PUBLIC_SOCKET_URL=https://your-domain.com
```

---

## 🧪 Testing Checklist

Sebelum deploy, pastikan semua fitur berjalan:

- [ ] Homepage load dengan baik
- [ ] Create page: pilih gambar dari galeri
- [ ] Create page: upload gambar custom
- [ ] Create room berhasil, redirect ke /room/[id]
- [ ] Puzzle pieces ter-render di canvas
- [ ] Drag & drop pieces berfungsi
- [ ] Buka room di 2 tab/device berbeda
- [ ] Lihat cursor pemain lain bergerak
- [ ] Drag piece di tab 1, lihat movement di tab 2
- [ ] Snap piece ke posisi benar
- [ ] Progress bar update
- [ ] Completion modal muncul saat selesai
- [ ] Tombol "Acak Ulang" berfungsi
- [ ] Tombol "Bagikan" copy link

---

## 🐛 Troubleshooting

### Build Error: "Cannot find module..."
```bash
rm -rf node_modules package-lock.json
npm install
```

### Socket.io tidak connect
- Pastikan `NEXT_PUBLIC_SOCKET_URL` benar
- Cek CORS settings di `socketServer.ts`
- Pastikan port 3000 tidak diblok firewall

### Canvas tidak render
- Pastikan `react-konva` dan `konva` version compatible
- Cek browser console untuk error
- Test di Chrome/Edge (terbaik untuk Canvas API)

### Pieces tidak drag
- Pastikan `usePieceSprites` loading selesai
- Cek `sprites.status === 'ready'`
- Lihat console untuk sprite loading errors

---

## 📊 Performance Tips

### Production Optimizations

1. **Enable Image Optimization:**
```javascript
// next.config.mjs
export default {
  images: {
    domains: ['yourdomain.com'],
  },
};
```

2. **Enable Compression:**
```bash
npm install compression
```

3. **Redis for Room Storage** (optional):
Ganti in-memory Map dengan Redis untuk persistent state.

---

## 🔒 Security Checklist

- [ ] Validasi upload file (size, type, dimensions)
- [ ] Rate limiting untuk API endpoints
- [ ] CORS properly configured
- [ ] Environment variables tidak di-commit
- [ ] .env.example tersedia untuk template

---

## 📞 Support

**Masalah?** Check:
1. Console browser (F12)
2. Server logs (`npm run dev`)
3. Network tab untuk failed requests

**Ready to deploy!** 🎉
