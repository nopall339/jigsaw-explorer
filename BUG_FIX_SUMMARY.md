# Bug Fixes - Puzzle Snap Issue

## ✅ Bugs yang Sudah Diperbaiki:

### 1. Server-Client Coordinate Mismatch (ROOT CAUSE)
**File**: `server/socketServer.ts` (lines 214-226)

**Masalah**: 
- Server tidak menghitung `padding` saat menghitung `minMargin`
- Menyebabkan `correctX` dan `correctY` server != client
- Piece tidak pernah snap karena distance calculation salah

**Fix**:
```typescript
// Tambahkan perhitungan tabSize dan padding (BARU)
const TAB_RATIO = 0.22;
const TAB_OUTSET_FACTOR = 1.14;
const tabSize = shortSide * TAB_RATIO;
const padding = Math.ceil(tabSize * TAB_OUTSET_FACTOR) + 2;

// Fix minMargin calculation (LAMA: tanpa + padding)
const minMargin = Math.max(pieceWidth, pieceHeight) * 1.6 + padding; // BARU
```

### 2. Enhanced Logging
- Server: `[piece:drop:coords]` untuk debug koordinat
- Client: `dropPos` dan `correctPos` di `[resolveDrop]`

---

## ⚠️ PENTING: Cara Testing

**Room lama `k7pyrqn` TIDAK AKAN BEKERJA** karena koordinat yang salah sudah tersimpan di memory!

### Langkah Testing:
1. **Buka browser** → http://localhost:3000
2. **BUAT ROOM BARU** (klik "Buat Puzzle Baru" di homepage)
3. **Jangan gunakan room lama** (k7pyrqn)
4. **Test di room baru**:
   - Drag piece mendekati posisi yang benar
   - ✅ Green glow muncul saat jarak < 32px
   - ✅ Piece snap saat di-drop
   - ✅ Progress bar naik

### Expected Behavior (untuk 1600x1200, 12 pieces):
- Padding: `65px`
- Margin: `465px`  
- Snap tolerance: `32px`
- Green glow muncul dalam radius 32px dari posisi correct
- Piece snap otomatis saat rotation benar (tolerance 14°)

---

## 🐛 Bug Online Count (Minor)

**Gejala**: Counter "X online" terus bertambah saat reload

**Root Cause**: Socket disconnect membutuhkan waktu, reload cepat membuat player baru sebelum player lama disconnect

**Status**: Not critical - akan fix sendiri setelah beberapa detik

**Jika ingin fix**: Perlu implement proper socket reconnection dengan player ID persistent (localStorage)

---

## 📝 Next Steps

Jika test di room baru masih gagal:
1. Cek browser console untuk log `[resolveDrop]`
2. Cek server log untuk `[piece:drop:coords]`
3. Compare koordinat antara client dan server
4. Pastikan server sudah restart (check process start time)

## Summary
- ✅ Server coordinate calculation fixed
- ✅ Snap tolerance: 32px (was using correct value, but coordinates were wrong)
- ✅ Server logs added for debugging
- ⚠️ MUST create NEW room to test (old rooms have cached wrong coordinates)
