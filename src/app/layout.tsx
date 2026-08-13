import type { Metadata, Viewport } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: {
    default: 'Jigsaw Explorer — Puzzle Jigsaw Online Bareng Teman',
    template: '%s · Jigsaw Explorer',
  },
  description:
    'Puzzle jigsaw digital gratis di browser. Pakai gambar bawaan atau foto sendiri, ' +
    'lalu kerjakan bersama teman secara real-time — cocok ditemani video call.',
  applicationName: 'Jigsaw Explorer',
  openGraph: {
    title: 'Jigsaw Explorer',
    description: 'Puzzle jigsaw online yang bisa dikerjakan bareng teman secara real-time.',
    type: 'website',
  },
};

export const viewport: Viewport = {
  themeColor: '#0b0f17',
  width: 'device-width',
  initialScale: 1,
  // Papan puzzle punya zoom sendiri; zoom browser malah mengganggu drag.
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="id">
      <body className="min-h-screen bg-board-950 font-sans">{children}</body>
    </html>
  );
}
