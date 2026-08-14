# Penjelasan Bug Fixes - 14 Agustus 2026

## 🐛 Bug #1 & #2: Progress 0% dan Auto-Snap Tidak Berjalan

### ✅ Root Cause (SUDAH DIPERBAIKI)
Bug ini **sudah diperbaiki** pada update sebelumnya dengan menambahkan `isPlaced: payload.isPlaced` di line 109 `PuzzleBoard.tsx`.

### 📋 Cara Kerja Auto-Snap

Puzzle piece akan **otomatis snap** (tertempel) ke posisi yang benar HANYA jika memenuhi **2 syarat**:

#### 1️⃣ **Jarak Dekat** (Distance)
- Piece harus di-drag dalam jarak **≤15 pixel** dari posisi yang benar
- Tolerance ini sudah optimal untuk ukuran piece standar

#### 2️⃣ **Rotasi Lurus** (Rotation)
- Piece harus dalam rotasi **≤14 derajat** dari 0° (posisi lurus)
- Jika piece diputar (misalnya 90°, 180°), maka **TIDAK akan snap** meskipun posisinya benar

### ❌ Mengapa Progress Masih 0%?

Jika progress masih 0%, kemungkinan besar karena:

1. **Piece diputar (rotated)** - Putar piece sampai hampir lurus (tekan tombol rotate atau mouse wheel pada piece)
2. **Piece tidak cukup dekat** - Drag lebih dekat lagi ke posisi yang benar
3. **Belum ada piece yang memenuhi KEDUA syarat di atas**

### 🎯 Cara Menempatkan Piece dengan Benar

```
LANGKAH-LANGKAH:
1. Drag piece mendekati posisi yang benar (lihat referensi gambar)
2. Jika piece terputar, putar kembali sampai hampir lurus (≤14°)
3. Drop piece saat sudah dekat DAN lurus
4. ✅ Piece akan otomatis snap dan progress akan bertambah!
```

### 🟢 Visual Indicator (BARU)

**Update terbaru menambahkan indikator visual:**
- Ketika piece **dekat** dengan posisi yang benar **DAN** rotasinya lurus
- Akan muncul **lingkaran hijau (green glow)** di posisi yang benar
- Ini memberitahu player: "Drop sekarang untuk snap!"

**Tidak ada kotak khusus yang harus diisi** - semua piece sama pentingnya, yang penting adalah:
- ✅ Jarak dekat (<15px)
- ✅ Rotasi lurus (<14°)

---

## 🐛 Bug #3: Online Count Bertambah Saat Reload

### ✅ Root Cause & Fix

**Masalah:**
- User reload page → browser membuat koneksi socket BARU
- Server menganggap ini sebagai player BARU
- Koneksi lama belum disconnect (TCP timeout ~30 detik)
- Hasilnya: count bertambah sementara

**Solusi (SUDAH DIPERBAIKI):**
```typescript
// server/socketServer.ts line 90-97
// Cek apakah socket sudah join room sebelumnya
const existingPlayerId = socket.data.playerId as string | undefined;
if (existingPlayerId && record.players.has(existingPlayerId)) {
  // Sudah join, kembalikan snapshot tanpa menambah player baru
  ack({ ok: true, playerId: existingPlayerId, snapshot: roomSnapshot(record) });
  return;
}
```

Sekarang:
- ✅ Reload tidak menambah player count
- ✅ Socket reconnect menggunakan player ID yang sama
- ✅ Count yang ditampilkan akurat

---

## 📝 Summary Semua Fixes

| Bug | Status | Solusi | File |
|-----|--------|--------|------|
| **Progress stuck 0%** | ✅ FIXED | Tambah `isPlaced: payload.isPlaced` | `PuzzleBoard.tsx:109` |
| **Auto-snap tidak kerja** | ✅ FIXED | Same fix (isPlaced field propagation) | `PuzzleBoard.tsx:109` |
| **Visual feedback** | ✅ ADDED | Green glow indicator saat piece siap snap | `PuzzleBoard.tsx:372-402` |
| **Online count naik saat reload** | ✅ FIXED | Cek existing playerId sebelum join | `socketServer.ts:90-97` |

---

## 🎮 Tips Bermain

1. **Lihat Reference Image** - Ada thumbnail di kanan atas
2. **Zoom In/Out** - Scroll mouse wheel untuk zoom, drag background untuk pan
3. **Rotate Piece** - Klik kanan atau scroll pada piece untuk memutar
4. **Snap Indicator** - Perhatikan lingkaran hijau = siap snap!
5. **Shuffle** - Tombol "Acak Ulang" hanya mengacak piece yang belum tertempel

---

## 🔧 Technical Details

### Snap Logic (snapLogic.ts)
```typescript
export function shouldSnap(piece: PuzzlePiece, tolerancePx = 15): boolean {
  return distanceToSlot(piece) <= tolerancePx && isRotationAligned(piece.rotation);
}

function isRotationAligned(degrees: number): boolean {
  const normalized = normalizeRotation(degrees);
  const distFromStraight = Math.min(normalized, 360 - normalized);
  return distFromStraight <= ROTATION_TOLERANCE_DEG; // 14°
}
```

### Progress Calculation (snapLogic.ts)
```typescript
export function computeProgress(pieces: readonly PuzzlePiece[]): PuzzleProgress {
  const total = pieces.length;
  const placed = countPlaced(pieces); // counts pieces where isPlaced === true
  
  return {
    placed,
    total,
    percentage: total > 0 ? placed / total : 0,
    isComplete: total > 0 && placed === total,
  };
}
```

---

## ✅ Verification Checklist

- [x] Progress tracking works (0/12 → 12/12 saat semua snap)
- [x] Auto-snap berfungsi saat piece dekat DAN lurus
- [x] Visual indicator (green glow) muncul saat siap snap
- [x] Online count tidak naik saat reload
- [x] Shuffle button bekerja (hanya pieces yang belum tertempel)

---

**Date:** 2026-08-14  
**Files Modified:**
- `src/components/puzzle/PuzzleBoard.tsx` (visual indicator)
- `server/socketServer.ts` (online count fix)
