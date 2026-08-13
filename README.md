# Jigsaw Explorer

Web app puzzle jigsaw digital gratis, bisa dimainkan sendiri atau bersama teman
secara real-time langsung dari browser.

## Cara pakai project ini dengan Claude Code

1. Buka folder ini di Claude Code / VS Code.
2. Baca `PROMPT.md` — itu adalah instruksi lengkap yang bisa langsung kamu
   tempel ke Claude Code untuk mulai membangun aplikasinya.
3. Struktur folder di bawah ini sudah disiapkan sebagai kerangka awal
   (masih kosong / berisi placeholder), tinggal diisi.

## Struktur Folder

```
jigsaw-explorer/
├── PROMPT.md                     # Prompt lengkap untuk Claude Code
├── README.md
├── package.json                  # Skeleton dependencies
├── public/
│   ├── sample-images/            # Gambar bawaan untuk galeri puzzle
│   └── icons/
└── src/
    ├── app/
    │   ├── page.tsx              # Landing page ("/")
    │   ├── create/
    │   │   └── page.tsx          # Halaman pilih gambar & kesulitan ("/create")
    │   ├── room/
    │   │   └── [roomId]/
    │   │       └── page.tsx      # Papan puzzle utama ("/room/xxx")
    │   └── api/
    │       ├── rooms/
    │       │   └── route.ts      # Create/get metadata room
    │       └── upload/
    │           └── route.ts      # Upload gambar custom
    ├── components/
    │   ├── puzzle/
    │   │   ├── PuzzleBoard.tsx   # Canvas utama tempat potongan dirender
    │   │   ├── PuzzlePiece.tsx   # Satu potongan puzzle (draggable)
    │   │   ├── PuzzleTray.tsx    # Area potongan yang belum terpasang
    │   │   ├── ReferenceImage.tsx# Gambar kecil referensi di pojok
    │   │   └── ProgressBar.tsx   # Indikator progres
    │   ├── ui/                   # Button, Modal, Slider dsb (generic)
    │   └── layout/
    │       ├── Navbar.tsx
    │       └── Footer.tsx
    ├── lib/
    │   ├── puzzle-engine/
    │   │   ├── generatePieces.ts # Logic pecah gambar jadi grid potongan
    │   │   ├── snapLogic.ts      # Logic snapping potongan ke posisi benar
    │   │   └── shuffle.ts
    │   └── socket/
    │       ├── client.ts         # Setup koneksi socket.io sisi client
    │       └── events.ts         # Daftar nama event socket (constants)
    ├── hooks/
    │   ├── usePuzzleState.ts     # State management papan puzzle
    │   └── useRoomSocket.ts      # Hook koneksi & sinkronisasi room
    └── types/
        └── index.ts              # PuzzlePiece, PuzzleRoom, Player, dll

server/
└── socketServer.ts               # Custom Node server untuk Socket.io
```

## Roadmap Singkat
- [ ] Setup Next.js + Tailwind, landing page statis
- [ ] Puzzle engine: pecah gambar jadi grid potongan (logic murni)
- [ ] Single-player board: drag, drop, snap, progres
- [ ] Upload gambar custom
- [ ] Room creation + link undangan
- [ ] Sinkronisasi multiplayer real-time via Socket.io
- [ ] Polish UI (biar nyaman dipakai berdampingan dengan video call)
