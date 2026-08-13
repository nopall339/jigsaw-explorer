# 🧪 Testing Guide - New Features

## Fitur Baru yang Perlu Ditest

### 🆕 1. Zoom & Pan ⚡

**Test Zoom:**
1. Buat puzzle dengan **300 pieces**
2. Scroll wheel untuk zoom in (sampai 300%)
3. Scroll wheel untuk zoom out (sampai 50%)
4. Perhatikan zoom indicator di kiri bawah

**Test Pan:**
1. Click & hold di area kosong
2. Drag untuk menggeser view
3. Lepas mouse

**Test Drag After Zoom:**
1. Zoom in 200%
2. Drag sebuah piece
3. Pastikan koordinat tetap akurat

**Test Reset Zoom:**
1. Klik tombol "🔍 Reset Zoom"
2. View kembali ke 1:1, posisi (0,0)

**Expected:**
- ✅ Zoom smooth tanpa lag
- ✅ Pan berfungsi dengan baik
- ✅ Pieces tetap bisa di-drag dengan koordinat benar
- ✅ Reset zoom mengembalikan view ke default
- ✅ Zoom indicator update real-time

---

### 🆕 2. Cursor Tracking 👥

**Player 1:**
1. Buka puzzle room
2. Gerakkan mouse di atas canvas

**Player 2 (Tab/device lain):**
1. Join room yang sama
2. **Perhatikan cursor Player 1 muncul:**
   - Dot berwarna di posisi mouse Player 1
   - Label nama di samping cursor
3. Gerakkan mouse sendiri
4. **Lihat cursor Player 2 muncul di tab Player 1**

**Test Leave:**
1. Close tab Player 1
2. **Di tab Player 2, cursor Player 1 hilang otomatis**

**Expected:**
- ✅ Cursor muncul dalam 50-100ms
- ✅ Label nama terlihat jelas
- ✅ Warna unik per player
- ✅ Cursor hilang saat player leave
- ✅ Tidak ada cursor untuk diri sendiri

---

### 🆕 3. Completion Stats 📊

**Solo Play:**
1. Buat puzzle 12 pieces
2. Selesaikan puzzle
3. **Modal completion muncul dengan stats:**
   - ⏱️ Waktu Total (format mm:ss)
   - 👥 Jumlah Pemain: 1 orang
   - 🧩 Potongan: 12 pieces
   - Kontributor: [nama player]

**Multiplayer:**
1. Player 1 buat puzzle 48 pieces
2. Player 2 & 3 join room
3. Semua player bantu selesaikan puzzle
4. **Modal completion menampilkan:**
   - ⏱️ Waktu Total: lebih lama (e.g., 5:23)
   - 👥 Jumlah Pemain: 3 orang
   - 🧩 Potongan: 48 pieces
   - Kontributor: [nama 3 players]

**Expected:**
- ✅ Waktu dihitung dari room.startedAt sampai completed
- ✅ Format waktu benar (mm:ss atau hh:mm:ss)
- ✅ Player count akurat
- ✅ Semua kontributor listed
- ✅ Semua player lihat stats yang sama

---

### 🆕 4. Video Call Friendly Layout 📹

**Test dengan window kecil:**
1. Resize browser window ke 1024x768
2. Simulasikan video call dengan overlay di atas
3. **Cek apakah:**
   - ✅ Top bar tidak menumpuk kontrol penting
   - ✅ Semua tombol di bottom accessible
   - ✅ Progress bar terlihat jelas
   - ✅ Zoom controls tidak tertutup

**Dengan video call aktif:**
1. Buka Google Meet / Zoom di tab lain
2. Taruh video call window picture-in-picture di pojok atas
3. Main puzzle di tab Jigsaw Explorer
4. **Pastikan:**
   - ✅ Tidak ada button tertutup video call
   - ✅ Progress bar tetap terlihat
   - ✅ Board masih comfortable untuk play

**Expected:**
- ✅ Layout responsive untuk video call
- ✅ Kontrol utama di bottom, tidak tertutup
- ✅ Top bar minimalis (hanya info)
- ✅ Nyaman dimainkan dengan video call aktif

---

## 🐛 Troubleshooting

### Zoom lag / glitchy
**Fix:**
- Clear browser cache
- Test di Chrome (recommended)

### Cursor tidak muncul
**Fix:**
- Pastikan 2 player berbeda (beda tab/device)
- Test dengan tab incognito

### Stats tidak muncul
**Fix:**
- Cek server logs untuk room:completed event
- Refresh page dan coba lagi

### Pan tidak berfungsi
**Fix:**
- Klik di area kosong, bukan di piece
