import { useCallback, useEffect, useMemo, useRef, useState, type PointerEvent } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Ban,
  Heart,
  HelpCircle,
  RotateCcw,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';
import { platformFamilyLabels } from '@grc/shared';
import { api, ApiError } from '../api/client';
import { PageSkeleton } from '../components/Skeleton';
import { EmptyState } from '../components/EmptyState';
import { formatDateEs } from '../utils/format';
import type { DiscoveryDecision, RawgGameCard } from '../types/rawg';
import { usePreferences } from '../providers/PreferencesProvider';
import { useOnline } from '../components/OfflineBanner';

const FILTERS_KEY = 'grc.discover.filters';

type Filters = {
  platforms: string[];
  requireDate: boolean;
  ordering: string;
};

const defaultFilters: Filters = {
  platforms: ['PLAYSTATION_5'],
  requireDate: true,
  ordering: 'released',
};

function loadFilters(preferredPlatforms?: string[]): Filters {
  try {
    const raw = localStorage.getItem(FILTERS_KEY);
    if (!raw) {
      return {
        ...defaultFilters,
        platforms:
          preferredPlatforms && preferredPlatforms.length > 0
            ? preferredPlatforms
            : defaultFilters.platforms,
      };
    }
    return { ...defaultFilters, ...JSON.parse(raw) };
  } catch {
    return defaultFilters;
  }
}

type DragState = { x: number; y: number; active: boolean };

export function DiscoverPage() {
  const queryClient = useQueryClient();
  const { preferences } = usePreferences();
  const online = useOnline();
  const [filters, setFilters] = useState<Filters>(() =>
    loadFilters(preferences?.preferredPlatforms),
  );
  const [prefsSynced, setPrefsSynced] = useState(false);
  const [queue, setQueue] = useState<RawgGameCard[]>([]);
  const [page, setPage] = useState(1);
  const [lastDecisionId, setLastDecisionId] = useState<string | null>(null);
  const [lastCard, setLastCard] = useState<RawgGameCard | null>(null);
  const [detail, setDetail] = useState<RawgGameCard | null>(null);
  const [hint, setHint] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const drag = useRef<DragState>({ x: 0, y: 0, active: false });
  const [offset, setOffset] = useState({ x: 0, y: 0 });

  useEffect(() => {
    if (prefsSynced || !preferences) return;
    if (!localStorage.getItem(FILTERS_KEY) && preferences.preferredPlatforms.length > 0) {
      setFilters((f) => ({ ...f, platforms: preferences.preferredPlatforms }));
    }
    setPrefsSynced(true);
  }, [preferences, prefsSynced]);

  useEffect(() => {
    localStorage.setItem(FILTERS_KEY, JSON.stringify(filters));
  }, [filters]);

  const discoverQuery = useQuery({
    queryKey: ['rawg', 'discover', filters, page],
    queryFn: () =>
      api.rawgDiscover({
        platforms: filters.platforms.join(',') || undefined,
        requireDate: filters.requireDate ? 'true' : 'false',
        ordering: filters.ordering,
        page,
        pageSize: 12,
      }),
  });

  useEffect(() => {
    if (!discoverQuery.data) return;
    setQueue((prev) => {
      const known = new Set(prev.map((g) => g.rawgId));
      const next = discoverQuery.data.items.filter((g) => !known.has(g.rawgId));
      return page === 1 ? discoverQuery.data.items : [...prev, ...next];
    });
  }, [discoverQuery.data, page]);

  const current = queue[0] ?? null;

  const decideMutation = useMutation({
    mutationFn: async (decision: DiscoveryDecision) => {
      if (!current) throw new Error('Sin carta');
      return api.discoveryDecide({
        rawgId: current.rawgId,
        title: current.title,
        slug: current.slug,
        coverUrl: current.coverUrl,
        backgroundUrl: current.backgroundUrl,
        releaseDate: current.releaseDate,
        platforms: current.platforms,
        genres: current.genres,
        normalizedPlatforms: current.normalizedPlatforms,
        metacritic: current.metacritic,
        description: current.description ?? null,
        decision,
      });
    },
    onSuccess: async (data, decision) => {
      setError(null);
      setLastDecisionId(data.decision.id);
      setLastCard(current);
      setQueue((q) => q.slice(1));
      setOffset({ x: 0, y: 0 });
      setHint(null);
      await queryClient.invalidateQueries({ queryKey: ['games'] });
      await queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      if (decision === 'DISMISSED') {
        await queryClient.invalidateQueries({ queryKey: ['discovery', 'dismissed'] });
      }
    },
    onError: (err) => {
      setError(err instanceof ApiError ? err.message : 'No se pudo guardar la decisión');
      setOffset({ x: 0, y: 0 });
      setHint(null);
    },
  });

  const undoMutation = useMutation({
    mutationFn: async () => {
      if (!lastDecisionId) throw new Error('Nada que deshacer');
      return api.discoveryUndo(lastDecisionId);
    },
    onSuccess: async () => {
      if (lastCard) {
        setQueue((q) => [lastCard, ...q]);
      }
      setLastCard(null);
      setLastDecisionId(null);
      await queryClient.invalidateQueries({ queryKey: ['games'] });
      await queryClient.invalidateQueries({ queryKey: ['discovery', 'dismissed'] });
    },
    onError: (err) => {
      setError(err instanceof ApiError ? err.message : 'No se pudo deshacer');
    },
  });

  const loadMore = useCallback(() => {
    if (discoverQuery.data?.hasMore) {
      setPage((p) => p + 1);
    }
  }, [discoverQuery.data?.hasMore]);

  useEffect(() => {
    if (queue.length <= 2 && discoverQuery.data?.hasMore && !discoverQuery.isFetching) {
      loadMore();
    }
  }, [queue.length, discoverQuery.data?.hasMore, discoverQuery.isFetching, loadMore]);

  const decide = useCallback(
    (decision: DiscoveryDecision) => {
      if (!current || decideMutation.isPending || !online) {
        if (!online) setError('Sin conexión: no se pueden guardar decisiones.');
        return;
      }
      void decideMutation.mutateAsync(decision);
    },
    [current, decideMutation, online],
  );

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        decide('DISMISSED');
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        decide('LIKED');
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        decide('MUST_BUY');
      } else if (e.key.toLowerCase() === 'm') {
        e.preventDefault();
        decide('THINKING');
      } else if (e.key.toLowerCase() === 'z') {
        e.preventDefault();
        if (lastDecisionId) void undoMutation.mutateAsync();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [decide, lastDecisionId, undoMutation]);

  const gestureHint = useMemo(() => {
    if (Math.abs(offset.x) < 40 && Math.abs(offset.y) < 40) return null;
    if (offset.y < -80) return 'Compra segura';
    if (offset.x > 80) return 'Me interesa';
    if (offset.x < -80) return 'Descartar';
    return null;
  }, [offset]);

  const onPointerDown = (e: PointerEvent<HTMLDivElement>) => {
    drag.current = { x: e.clientX, y: e.clientY, active: true };
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const onPointerMove = (e: PointerEvent<HTMLDivElement>) => {
    if (!drag.current.active) return;
    const dx = e.clientX - drag.current.x;
    const dy = e.clientY - drag.current.y;
    setOffset({ x: dx, y: dy });
    if (dy < -80) setHint('Compra segura');
    else if (dx > 80) setHint('Me interesa');
    else if (dx < -80) setHint('Descartar');
    else setHint(null);
  };

  const onPointerUp = () => {
    if (!drag.current.active) return;
    drag.current.active = false;
    if (offset.y < -120) decide('MUST_BUY');
    else if (offset.x > 120) decide('LIKED');
    else if (offset.x < -120) decide('DISMISSED');
    else {
      setOffset({ x: 0, y: 0 });
      setHint(null);
    }
  };

  const platformOptions = Object.entries(platformFamilyLabels).filter(
    ([key]) => key !== 'OTHER',
  );

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-4 md:gap-6">
      <header>
        <h2 className="text-2xl font-semibold sm:text-3xl">Descubrir</h2>
        <p className="mt-2 text-sm text-ink-muted sm:text-base">
          Desliza o usa los botones. Izquierda descarta, derecha interesa, arriba compra segura.
        </p>
      </header>

      <details className="rounded-xl border border-white/10 bg-surface-elevated/50 p-3">
        <summary className="cursor-pointer text-sm font-medium">Filtros</summary>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <fieldset>
            <legend className="mb-2 text-xs text-ink-muted">Plataformas</legend>
            <div className="flex flex-wrap gap-2">
              {platformOptions.map(([value, label]) => {
                const active = filters.platforms.includes(value);
                return (
                  <button
                    key={value}
                    type="button"
                    className={`min-h-10 rounded-lg px-2.5 py-1.5 text-xs ${
                      active ? 'bg-accent/20 text-accent' : 'border border-white/10 text-ink-muted'
                    }`}
                    onClick={() => {
                      setPage(1);
                      setQueue([]);
                      setFilters((f) => ({
                        ...f,
                        platforms: active
                          ? f.platforms.filter((p) => p !== value)
                          : [...f.platforms, value],
                      }));
                    }}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
          </fieldset>
          <div className="space-y-3">
            <label className="flex min-h-11 items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={filters.requireDate}
                onChange={(e) => {
                  setPage(1);
                  setQueue([]);
                  setFilters((f) => ({ ...f, requireDate: e.target.checked }));
                }}
              />
              Solo con fecha
            </label>
            <div>
              <label htmlFor="ordering" className="mb-1 block text-xs text-ink-muted">
                Orden
              </label>
              <select
                id="ordering"
                className="touch-field w-full rounded-lg border border-white/10 bg-surface px-3 py-2 text-sm"
                value={filters.ordering}
                onChange={(e) => {
                  setPage(1);
                  setQueue([]);
                  setFilters((f) => ({ ...f, ordering: e.target.value }));
                }}
              >
                <option value="released">Fecha de lanzamiento</option>
                <option value="-rating">Popularidad</option>
                <option value="-metacritic">Metacritic</option>
              </select>
            </div>
          </div>
        </div>
      </details>

      {error ? (
        <p className="rounded-lg bg-danger/10 px-3 py-2 text-sm text-danger" role="alert">
          {error}
        </p>
      ) : null}

      {discoverQuery.data?.rawgUnavailable ? (
        <p className="rounded-lg bg-warning/10 px-3 py-2 text-sm text-warning" role="status">
          RAWG no está disponible ahora. Tus juegos y reservas siguen accesibles.
        </p>
      ) : null}

      {discoverQuery.isLoading && queue.length === 0 ? <PageSkeleton /> : null}

      {!discoverQuery.isLoading && !current ? (
        <EmptyState
          title="No hay más cartas"
          description="Prueba otros filtros o vuelve más tarde."
          action={
            <button
              type="button"
              className="text-sm text-accent underline"
              onClick={() => {
                setPage(1);
                setQueue([]);
                void discoverQuery.refetch();
              }}
            >
              Recargar
            </button>
          }
        />
      ) : null}

      {current ? (
        <div className="relative mx-auto w-full max-w-md">
          {(hint || gestureHint) && (
            <div
              className="pointer-events-none absolute inset-x-0 top-4 z-20 text-center text-lg font-semibold text-accent"
              aria-live="polite"
            >
              {hint || gestureHint}
            </div>
          )}

          <article
            className="select-none overflow-hidden rounded-2xl border border-white/10 bg-surface-elevated shadow-2xl shadow-black/40 touch-none"
            style={{
              transform: `translate(${offset.x}px, ${offset.y}px) rotate(${offset.x / 30}deg)`,
              transition: drag.current.active ? 'none' : 'transform 160ms ease',
            }}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerCancel={onPointerUp}
          >
            <div className="relative aspect-[3/4] bg-surface">
              {current.coverUrl || current.backgroundUrl ? (
                <img
                  src={current.coverUrl || current.backgroundUrl || ''}
                  alt={`Portada de ${current.title}`}
                  className="h-full w-full object-cover"
                  draggable={false}
                />
              ) : (
                <div className="flex h-full items-center justify-center text-ink-muted">Sin imagen</div>
              )}
              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent p-4 pt-16">
                <h3 className="text-xl font-semibold">{current.title}</h3>
                <p className="mt-1 text-sm text-white/80">{formatDateEs(current.releaseDate)}</p>
              </div>
            </div>
            <div className="space-y-2 p-4 text-sm">
              <p className="text-ink-muted">
                {current.platforms.slice(0, 4).join(' · ') || 'Sin plataformas'}
              </p>
              <p className="text-ink-muted">{current.genres.slice(0, 4).join(' · ')}</p>
              {current.metacritic != null ? (
                <p>
                  Metacritic: <span className="font-semibold text-accent">{current.metacritic}</span>
                </p>
              ) : null}
              <button
                type="button"
                className="text-accent underline"
                onClick={() => {
                  void api.rawgDetail(current.rawgId).then((r) => setDetail(r.game));
                }}
              >
                Ver detalles
              </button>
            </div>
          </article>

          <div className="mt-4 grid grid-cols-5 gap-2">
            <ActionButton
              label="Descartar"
              icon={Ban}
              onClick={() => decide('DISMISSED')}
              disabled={!online || decideMutation.isPending}
              tone="danger"
            />
            <ActionButton
              label="Me lo pienso"
              icon={HelpCircle}
              onClick={() => decide('THINKING')}
              disabled={!online || decideMutation.isPending}
              tone="warning"
            />
            <ActionButton
              label="Deshacer"
              icon={RotateCcw}
              onClick={() => lastDecisionId && void undoMutation.mutateAsync()}
              disabled={!online || !lastDecisionId || undoMutation.isPending}
              tone="muted"
            />
            <ActionButton
              label="Me interesa"
              icon={Heart}
              onClick={() => decide('LIKED')}
              disabled={!online || decideMutation.isPending}
              tone="accent"
            />
            <ActionButton
              label="Compra segura"
              icon={ShieldCheck}
              onClick={() => decide('MUST_BUY')}
              disabled={!online || decideMutation.isPending}
              tone="special"
            />
          </div>
          <p className="mt-3 text-center text-[11px] text-ink-muted">
            Atajos: ← descartar · → interesa · ↑ compra segura · M me lo pienso · Z deshacer
          </p>
        </div>
      ) : null}

      {detail ? (
        <div className="fixed inset-0 z-40 flex items-end justify-center bg-black/60 p-3 sm:items-center">
          <div
            role="dialog"
            aria-modal="true"
            aria-label={`Detalle de ${detail.title}`}
            className="max-h-[85dvh] w-full max-w-lg overflow-y-auto rounded-2xl border border-white/10 bg-surface-elevated p-4"
          >
            <div className="mb-3 flex items-start justify-between gap-3">
              <h3 className="text-lg font-semibold">{detail.title}</h3>
              <button
                type="button"
                className="min-h-10 rounded-lg px-2 text-sm text-ink-muted hover:bg-white/5"
                onClick={() => setDetail(null)}
              >
                Cerrar
              </button>
            </div>
            {detail.description ? (
              <p className="whitespace-pre-wrap text-sm text-ink-muted">{detail.description}</p>
            ) : (
              <p className="text-sm text-ink-muted">Sin descripción.</p>
            )}
            <p className="mt-3 text-xs text-ink-muted">
              {detail.developer ? `Dev: ${detail.developer}` : null}
              {detail.publisher ? ` · Pub: ${detail.publisher}` : null}
            </p>
          </div>
        </div>
      ) : null}

      {decideMutation.isPending ? (
        <p className="flex items-center justify-center gap-2 text-sm text-ink-muted" role="status">
          <Sparkles className="size-4" aria-hidden /> Guardando…
        </p>
      ) : null}
    </div>
  );
}

function ActionButton({
  label,
  icon: Icon,
  onClick,
  disabled,
  tone,
}: {
  label: string;
  icon: typeof Heart;
  onClick: () => void;
  disabled?: boolean;
  tone: 'danger' | 'warning' | 'accent' | 'special' | 'muted';
}) {
  const tones = {
    danger: 'border-danger/40 text-danger',
    warning: 'border-warning/40 text-warning',
    accent: 'border-accent/40 text-accent',
    special: 'border-fuchsia-400/40 text-fuchsia-200',
    muted: 'border-white/15 text-ink-muted',
  };
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      disabled={disabled}
      onClick={onClick}
      className={`flex min-h-14 flex-col items-center justify-center gap-1 rounded-xl border px-1 text-[10px] disabled:opacity-40 ${tones[tone]}`}
    >
      <Icon className="size-5" aria-hidden />
      <span className="leading-tight">{label}</span>
    </button>
  );
}
