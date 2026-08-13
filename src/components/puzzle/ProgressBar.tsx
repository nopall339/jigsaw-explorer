interface ProgressBarProps {
  placed: number;
  total: number;
  className?: string;
}

export default function ProgressBar({ placed, total, className }: ProgressBarProps) {
  const percent = total > 0 ? Math.round((placed / total) * 100) : 0;

  return (
    <div className={className}>
      <div className="mb-2 flex items-baseline justify-between text-sm">
        <span className="font-medium text-slate-200">Progres</span>
        <span className="tabular-nums text-slate-400">
          {placed} / {total} ({percent}%)
        </span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-board-800">
        <div
          className="h-full rounded-full bg-mint transition-[width] duration-300 ease-out"
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  );
}
