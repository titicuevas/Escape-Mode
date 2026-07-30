import { CalendarDays } from 'lucide-react';

export function AppLoader({
  label = 'Cargando',
  compact = false,
}: {
  label?: string;
  compact?: boolean;
}) {
  return (
    <div
      className={`flex flex-col items-center justify-center gap-3 ${compact ? 'py-8' : 'py-16'}`}
      role="status"
      aria-live="polite"
      aria-label={label}
    >
      <div className={`relative ${compact ? 'size-10' : 'size-14'}`}>
        <div className="absolute inset-0 rounded-full border-2 border-accent/15" />
        <div className="absolute inset-0 animate-spin rounded-full border-2 border-transparent border-t-accent border-r-accent/50" />
        <div className="absolute inset-[18%] rounded-full border border-dashed border-focus/35 animate-[spin_2.8s_linear_infinite_reverse]" />
        <CalendarDays
          className={`absolute inset-0 m-auto text-accent ${compact ? 'size-4' : 'size-5'}`}
          aria-hidden
        />
      </div>
      <p className="text-sm text-ink-muted">{label}…</p>
    </div>
  );
}
