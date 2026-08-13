'use client';

import { useEffect } from 'react';
import { cn } from '@/lib/utils';

export interface ModalProps {
  open: boolean;
  onClose?: () => void;
  title?: string;
  children: React.ReactNode;
  className?: string;
  /** Tutup lewat klik backdrop / tombol Esc. Matikan untuk dialog wajib. */
  dismissable?: boolean;
}

export function Modal({
  open,
  onClose,
  title,
  children,
  className,
  dismissable = true,
}: ModalProps) {
  useEffect(() => {
    if (!open || !dismissable) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose?.();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open, dismissable, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-label={title}
    >
      <button
        type="button"
        aria-label="Tutup"
        tabIndex={dismissable ? 0 : -1}
        className="absolute inset-0 cursor-default bg-board-950/80 backdrop-blur-sm"
        onClick={dismissable ? onClose : undefined}
      />
      <div
        className={cn(
          'relative w-full max-w-lg animate-fade-in rounded-2xl border border-white/10 bg-board-900 p-6 shadow-2xl',
          className,
        )}
      >
        {title ? <h2 className="mb-4 text-lg font-semibold text-slate-100">{title}</h2> : null}
        {children}
      </div>
    </div>
  );
}
