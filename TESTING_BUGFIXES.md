# 🧪 Testing Checklist - Bug Fixes

## Date: August 13, 2026

---

## Test #1: Share Button dengan Toast

### Steps:
1. `npm run dev`
2. Buka http://localhost:3000
3. Create puzzle baru (12 pieces untuk cepat)
4. Klik tombol "📤 Bagikan" (bottom-right)
5. **Verify:**
   - ✅ Toast hijau muncul di top-center
   - ✅ Toast auto-dismiss setelah 3 detik
   - ✅ Console log: `[handleShare] Copy success: http://localhost:3000/room/...`
6. Paste (Ctrl+V) di address bar baru
7. **Verify:**
   - ✅ URL lengkap muncul (bukan kosong)
   - ✅ Format: `http://localhost:3000/room/[roomId]`
8. Buka URL di incognito tab
9. **Verify:**
   - ✅ Room berhasil di-load
   - ✅ Join sebagai player kedua
   - ✅ Online count bertambah (2 online)

### Expected Result:
✅ Toast notification → URL valid → Join berhasil

---

## Test #2: Page Scroll

### Steps:
1. Buka room puzzle yang sudah ada
2. Resize browser window ke 1024x600 (pendek)
3. **Verify:**
   - ✅ Scrollbar vertikal muncul
   - ✅ Bisa scroll down untuk lihat bottom controls
   - ✅ Bisa scroll up untuk lihat top bar
4. Test zoom/pan di canvas:
   - Scroll wheel di atas canvas → zoom in/out
   - Click & drag di area kosong → pan
5. **Verify:**
   - ✅ Zoom/pan tetap berfungsi
   - ✅ Page scroll independen dari canvas zoom

### Expected Result:
✅ Page scrollable → Zoom/pan tidak bentrok

---

## Test #3: Cross-browser

### Browsers to Test:
- [ ] Chrome (primary)
- [ ] Firefox
- [ ] Edge
- [ ] Safari (Mac/iOS)

### Verify di Each Browser:
- [ ] Toast muncul dan auto-dismiss
- [ ] Clipboard copy berhasil
- [ ] Page scroll works
- [ ] Zoom/pan smooth

---

## Test #4: Mobile Responsive

### Devices:
- [ ] Mobile portrait (375x667)
- [ ] Mobile landscape (667x375)
- [ ] Tablet (768x1024)

### Verify:
- [ ] Share button accessible
- [ ] Toast readable
- [ ] Page scrollable
- [ ] Controls tidak terpotong

---

## 🐛 Known Issues

### None Found Yet
- All TypeScript checks passed
- No console errors in dev mode

---

## 🚀 Deploy Checklist

- [ ] All tests passed
- [ ] No console errors
- [ ] Performance check (FPS > 30)
- [ ] Memory leaks check
- [ ] Production build success: `npm run build`

---

**Status:** ⬜ **READY FOR MANUAL TESTING**

Run `npm run dev` to start testing!
