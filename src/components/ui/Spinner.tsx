import { cn } from '@/lib/utils';

export function Spinner({ className }: { className?: string }) {
  return (
    <span
      role="status"
      aria-label="Memuat"
      className={cn(
        'inline-block h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent',
        className,
      )}
    />
  );
}

/** Bar progres dengan efek shimmer, dipakai saat memotong gambar jadi potongan. */
export function LoadingBar({ ratio, label }: { ratio: number; label: string }) {
  const percent = Math.round(Math.min(1, Math.max(0, ratio)) * 100);

  return (
    <div className="w-64 max-w-full">
      <div className="mb-2 flex items-baseline justify-between text-sm text-slate-300">
        <span>{label}</span>
        <span className="tabular-nums text-slate-400">{percent}%</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-board-800">
        <div
          className="h-full rounded-full bg-accent transition-[width] duration-150 ease-out"
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  );
}
