# Testing Guide - Bug Fixes 2026-08-14

## 🧪 How to Test All Fixes

### Test 1: Progress Tracking & Auto-Snap ✅

**Steps:**
1. Start dev server: `npm run dev`
2. Open browser → Create new puzzle (any image, 12 pieces)
3. Join room
4. Pick any puzzle piece
5. Drag piece close to its correct position (compare with reference image)
6. **Look for GREEN GLOW** - it should appear when:
   - Distance < 15px from correct position
   - Piece rotation is nearly straight (< 14°)
7. Drop the piece
8. **Expected:** Piece snaps perfectly, progress shows 1/12

**If piece doesn't snap:**
- ❌ No green glow? → Piece is either too far OR rotated
- ✅ Green glow appears? → Rotation or distance needs adjustment
- Try rotating piece with right-click/mouse wheel
- Try dragging closer to target position

### Test 2: Visual Indicator ✅

**Steps:**
1. Pick a piece and drag it around
2. Move it NEAR correct position but rotated 90°
3. **Expected:** NO green glow (rotation not aligned)
4. Rotate piece back to straight (0°)
5. **Expected:** Green glow appears!
6. Drop piece
7. **Expected:** Snaps perfectly with satisfying feedback

### Test 3: Online Count on Reload ✅

**Steps:**
1. Open puzzle room
2. Note online count (should be 1)
3. Press F5 to reload page
4. **Expected:** Online count stays 1 (not 2)
5. Check console log: should see "Player already in room, returning snapshot"

**Before fix:** Count would go to 2 temporarily  
**After fix:** Count stays at 1

### Test 4: Multiple Players ✅

**Steps:**
1. Open room in Browser 1
2. Copy room URL
3. Open same URL in Browser 2 (different browser/incognito)
4. **Expected:** Count shows 2
5. Reload Browser 1
6. **Expected:** Count still shows 2 (not 3)
7. Close Browser 2
8. **Expected:** Count goes back to 1

---

## 🔍 Visual Verification

### What You Should See:

**Green Glow Indicator:**
```
┌─────────────┐
│  Piece      │  ← Being dragged
└─────────────┘
       ↓
    🟢 Green glow here when ready to snap
       ↓
┌─────────────┐
│  Correct    │  ← Target position
│  Position   │
└─────────────┘
```

**Progress Counter:**
- Should update: 0/12 → 1/12 → 2/12 → ... → 12/12
- Updates ONLY when piece actually snaps (isPlaced = true)

**Online Count:**
- Should match actual number of different users
- Should NOT increase on page reload
- Should decrease when user closes browser

---

## 🐛 Common Issues & Solutions

### "Green glow appears but piece doesn't snap"
- Check if you're actually dropping the piece (release mouse)
- Check console for errors
- Verify `isPlaced` field in network tab (piece:dropped event)

### "Progress still shows 0/12 after snapping"
- Check if green glow appeared before drop
- Verify piece actually snapped to grid (not floating)
- Check if `puzzleState.progress.placed` is updating

### "Online count still increases on reload"
- Clear browser cache and try again
- Check server logs for "already in room" message
- Verify `socket.data.playerId` is persisting

---

## 📊 Success Criteria

✅ **All tests pass if:**

1. Green glow appears when piece is ready to snap
2. Piece snaps perfectly when dropped on green glow
3. Progress increases from 0/12 to 12/12 as pieces are placed
4. Online count stays accurate on reload
5. Multiple players can join without duplicate counts
6. No console errors

---

## 🚀 Quick Start

```bash
# Terminal 1 - Start server
npm run dev

# Terminal 2 - Watch for errors (optional)
npx tsc --noEmit --watch

# Browser
http://localhost:3000
```

---

**Date:** 2026-08-14  
**Status:** Ready for testing
