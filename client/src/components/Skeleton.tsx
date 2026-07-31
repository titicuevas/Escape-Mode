import { useMemo } from 'react';
import { AppLoader } from './AppLoader';

export function Skeleton({ className = '' }: { className?: string }) {
  return (
    <div
      className={`animate-pulse rounded-lg bg-white/10 ${className}`}
      aria-hidden
    />
  );
}

const LAYOUTS = ['cards', 'list', 'hero'] as const;

export function PageSkeleton({ label }: { label?: string }) {
  const layout = useMemo(
    () => LAYOUTS[Math.floor(Math.random() * LAYOUTS.length)]!,
    [],
  );

  return (
    <div className="page-enter space-y-6" role="status" aria-label={label ?? 'Cargando'}>
      <AppLoader label={label} />
      <div aria-hidden>
        {layout === 'cards' ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <Skeleton className="h-48" />
            <Skeleton className="h-48" />
            <Skeleton className="h-48" />
          </div>
        ) : null}
        {layout === 'list' ? (
          <div className="space-y-3">
            <Skeleton className="h-16" />
            <Skeleton className="h-16" />
            <Skeleton className="h-16" />
            <Skeleton className="h-16" />
          </div>
        ) : null}
        {layout === 'hero' ? (
          <div className="space-y-4">
            <Skeleton className="h-56 sm:h-64" />
            <div className="grid gap-3 sm:grid-cols-2">
              <Skeleton className="h-24" />
              <Skeleton className="h-24" />
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
