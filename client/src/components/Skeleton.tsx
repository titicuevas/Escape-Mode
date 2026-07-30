import { AppLoader } from './AppLoader';

export function Skeleton({ className = '' }: { className?: string }) {
  return (
    <div
      className={`animate-pulse rounded-lg bg-white/10 ${className}`}
      aria-hidden
    />
  );
}

export function PageSkeleton({ label = 'Cargando' }: { label?: string }) {
  return (
    <div className="space-y-6" role="status" aria-label={label}>
      <AppLoader label={label} />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3" aria-hidden>
        <Skeleton className="h-48" />
        <Skeleton className="h-48" />
        <Skeleton className="h-48" />
      </div>
    </div>
  );
}
