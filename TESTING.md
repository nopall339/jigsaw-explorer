# 🎮 Jigsaw Explorer - Testing Guide

## ✅ Quick Start

### 1. Jalankan Server
```bash
npm run dev
```

Tunggu sampai muncul:
```
✓ Ready on http://localhost:3000
✓ Socket.io enabled
```

### 2. Buka Browser
```
http://localhost:3000
```

---

## 🧪 Testing Scenarios

### Scenario 1: Single Player - Basic Flow

1. **Homepage** → Klik "Buat Puzzle Baru"
2. **Create Page:**
   - Pilih gambar dari galeri (kategori: Alam, Hewan, Kota, dll)
   - Pilih kesulitan: 12 pieces (mudah)
   - Rotation: OFF
   - Klik "Mulai Puzzle"
3. **Room Page:**
   - Tunggu pieces loading
   - Drag & drop pieces
   - Lihat progress bar bertambah
   - Snap pieces ke posisi benar
   - Lihat completion modal saat selesai

**Expected Result:** ✅ Puzzle berfungsi smooth tanpa lag

---

### Scenario 2: Multiplayer - 2 Players

**Player 1 (Tab 1):**
1. Buat puzzle baru
2. Copy URL dari address bar
3. Drag beberapa pieces

**Player 2 (Tab 2/Device lain):**
1. Paste URL dan buka
2. Lihat pieces yang sama dengan Player 1
3. Lihat cursor Player 1 bergerak
4. Drag pieces yang berbeda
5. Coba drag piece yang sedang di-drag Player 1

**Expected Result:**
- ✅ Player 2 langsung lihat state puzzle terkini
- ✅ Cursor Player 1 terlihat real-time
- ✅ Pieces yang di-drag Player 1 terkunci (tidak bisa di-drag Player 2)
- ✅ Movement synchronized instantly

---

### Scenario 3: Upload Custom Image

1. **Create Page** → Tab "Upload"
2. Klik "Pilih File"
3. Upload gambar (JPG/PNG, max 10MB)
4. Pilih kesulitan: 48 pieces
5. Rotation: ON
6. Mulai Puzzle

**Expected Result:**
- ✅ Preview image muncul
- ✅ Validation error jika file terlalu besar
- ✅ Pieces ter-render dengan rotasi random

---

### Scenario 4: Stress Test - Many Pieces

1. Buat puzzle dengan 300 pieces
2. Cek loading time sprite generation
3. Test drag performance

**Expected Result:**
- ✅ Loading < 10 detik
- ✅ Drag tetap smooth (60fps)
- ✅ No memory leaks

---

### Scenario 5: Connection Handling

**Test Disconnect:**
1. Buka puzzle multiplayer
2. Matikan WiFi / disconnect internet
3. Lihat indicator "Koneksi terputus..."
4. Nyalakan WiFi kembali

**Expected Result:**
- ✅ Status indicator muncul
- ✅ Auto-reconnect saat online kembali
- ✅ State puzzle ter-sinkronisasi ulang

---

### Scenario 6: Room Features

**Test Reset:**
1. Buka puzzle yang sudah progress 50%
2. Klik "Acak Ulang"

**Expected Result:**
- ✅ Semua pieces kembali ke posisi random
- ✅ Progress reset ke 0%
- ✅ Semua players di room melihat perubahan

**Test Share:**
1. Klik tombol "Bagikan"
2. Link ter-copy ke clipboard

**Expected Result:**
- ✅ Alert "Link disalin!"
- ✅ Link membuka room yang sama
