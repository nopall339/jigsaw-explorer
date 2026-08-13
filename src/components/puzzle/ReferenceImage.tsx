'use client';

import { useState } from 'react';

interface ReferenceImageProps {
  imageUrl: string;
  imageTitle: string;
}

export default function ReferenceImage({ imageUrl, imageTitle }: ReferenceImageProps) {
  const [isVisible, setIsVisible] = useState(true);

  if (!isVisible) {
    return (
      <button
        onClick={() => setIsVisible(true)}
        className="rounded-lg bg-board-800/80 p-2 text-sm text-slate-400 backdrop-blur-sm transition-colors hover:bg-board-700 hover:text-slate-200"
        title="Tampilkan referensi"
      >
        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
        </svg>
      </button>
    );
  }

  return (
    <div className="relative overflow-hidden rounded-xl border border-white/10 bg-board-900 shadow-lg">
      <div className="aspect-[4/3] w-48">
        <img
          src={imageUrl}
          alt={imageTitle}
          className="h-full w-full object-cover"
        />
      </div>
      <div className="flex items-center justify-between border-t border-white/10 bg-board-800/50 px-3 py-2">
        <span className="truncate text-xs text-slate-400">{imageTitle}</span>
        <button
          onClick={() => setIsVisible(false)}
          className="ml-2 text-slate-500 transition-colors hover:text-slate-300"
          title="Sembunyikan"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    </div>
  );
}
