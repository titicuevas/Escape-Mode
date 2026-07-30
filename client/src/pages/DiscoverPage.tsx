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
import { CoverImage } from '../components/CoverImage';

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

type DragState = {
  startX: number;
  startY: number;
  x: number;
  y: number;
  active: boolean;
  axis: 'x' | 'y' | null;
  pointerId: number | null;
};

const HINT_PX = 36;
const COMMIT_PX = 72;
const AXIS_LOCK_PX = 12;

const decisionMeta: Record<
  DiscoveryDecision,
  { label: string; color: string; bg: string; border: string }
> = {
  DISMISSED: {
    label: 'Descartar',
    color: '#f87171',
    bg: 'rgba(248, 113, 113, 0.28)',
    border: 'rgba(248, 113, 113, 0.85)',
  },
  LIKED: {
    label: 'Me interesa',
    color: '#5eead4',
    bg: 'rgba(94, 234, 212, 0.28)',
    border: 'rgba(94, 234, 212, 0.85)',
  },
  THINKING: {
    label: 'Me lo pienso',
    color: '#fbbf24',
    bg: 'rgba(251, 191, 36, 0.28)',
    border: 'rgba(251, 191, 36, 0.85)',
  },
  MUST_BUY: {
    label: 'Compra segura',
    color: '#e879f9',
    bg: 'rgba(232, 121, 249, 0.28)',
    border: 'rgba(232, 121, 249, 0.85)',
  },
};

function resolveGesture(x: number, y: number): DiscoveryDecision | null {
  const ax = Math.abs(x);
  const ay = Math.abs(y);
  if (ax < HINT_PX && ay < HINT_PX) return null;
  if (ay >= ax) {
    if (y < -HINT_PX) return 'MUST_BUY';
    if (y > HINT_PX) return 'THINKING';
    return null;
  }
  if (x > HINT_PX) return 'LIKED';
  if (x < -HINT_PX) return 'DISMISSED';
  return null;
}

function resolveCommit(x: number, y: number): DiscoveryDecision | null {
  const ax = Math.abs(x);
  const ay = Math.abs(y);
  if (ay >= ax && ay >= COMMIT_PX) return y < 0 ? 'MUST_BUY' : 'THINKING';
  if (ax > ay && ax >= COMMIT_PX) return x > 0 ? 'LIKED' : 'DISMISSED';
  return null;
}

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
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const drag = useRef<DragState>({
    startX: 0,
    startY: 0,
    x: 0,
    y: 0,
    active: false,
    axis: null,
    pointerId: null,
  });
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [leaving, setLeaving] = useState<DiscoveryDecision | null>(null);

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
      setLeaving(null);
      await queryClient.invalidateQueries({ queryKey: ['games'] });
      await queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      if (decision === 'DISMISSED') {
        await queryClient.invalidateQueries({ queryKey: ['discovery', 'dismissed'] });
      }
    },
    onError: (err) => {
      setError(err instanceof ApiError ? err.message : 'No se pudo guardar la decisión');
      setOffset({ x: 0, y: 0 });
      setLeaving(null);
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
      if (!current || decideMutation.isPending || !online || leaving) {
        if (!online) setError('Sin conexión: no se pueden guardar decisiones.');
        return;
      }

      const exit =
        decision === 'LIKED'
          ? { x: 420, y: 0 }
          : decision === 'DISMISSED'
            ? { x: -420, y: 0 }
            : decision === 'MUST_BUY'
              ? { x: 0, y: -480 }
              : { x: 0, y: 480 };

      setLeaving(decision);
      setOffset(exit);
      window.setTimeout(() => {
        void decideMutation.mutateAsync(decision);
      }, 160);
    },
    [current, decideMutation, online, leaving],
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
      } else if (e.key === 'ArrowDown' || e.key.toLowerCase() === 'm') {
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

  const activeGesture = useMemo(
    () => (leaving ? leaving : resolveGesture(offset.x, offset.y)),
    [leaving, offset.x, offset.y],
  );
  const gestureStrength = useMemo(() => {
    const dist = Math.max(Math.abs(offset.x), Math.abs(offset.y));
    return Math.min(1, dist / COMMIT_PX);
  }, [offset.x, offset.y]);

  const onPointerDown = (e: PointerEvent<HTMLElement>) => {
    if (leaving || decideMutation.isPending) return;
    const target = e.target as HTMLElement | null;
    if (target?.closest('button, a, input, textarea, select, label')) return;

    drag.current = {
      startX: e.clientX,
      startY: e.clientY,
      x: 0,
      y: 0,
      active: true,
      axis: null,
      pointerId: e.pointerId,
    };
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const onPointerMove = (e: PointerEvent<HTMLElement>) => {
    if (!drag.current.active) return;
    let dx = e.clientX - drag.current.startX;
    let dy = e.clientY - drag.current.startY;

    if (!drag.current.axis) {
      if (Math.abs(dx) > AXIS_LOCK_PX || Math.abs(dy) > AXIS_LOCK_PX) {
        drag.current.axis = Math.abs(dx) >= Math.abs(dy) ? 'x' : 'y';
      }
    }

    if (drag.current.axis === 'x') dy *= 0.15;
    if (drag.current.axis === 'y') dx *= 0.15;

    // Resistencia suave para que no haga falta arrastrar tanto
    dx *= 1.15;
    dy *= 1.15;

    drag.current.x = dx;
    drag.current.y = dy;
    setOffset({ x: dx, y: dy });

    if (drag.current.axis) {
      e.preventDefault();
    }
  };

  const resetDrag = () => {
    drag.current.active = false;
    drag.current.axis = null;
    drag.current.pointerId = null;
  };

  const onPointerUp = () => {
    if (!drag.current.active) return;
    const { x, y } = drag.current;
    resetDrag();
    const commit = resolveCommit(x, y);
    if (commit) {
      decide(commit);
      return;
    }
    setOffset({ x: 0, y: 0 });
  };

  const openDetails = useCallback(() => {
    if (!current || !online) {
      if (!online) setError('Sin conexión: no se pueden cargar los detalles.');
      return;
    }
    setError(null);
    setDetailOpen(true);
    setDetailLoading(true);
    setDetail(null);
    void api
      .rawgDetail(current.rawgId)
      .then((r) => {
        setDetail(r.game);
      })
      .catch((err) => {
        setDetailOpen(false);
        setError(err instanceof ApiError ? err.message : 'No se pudieron cargar los detalles');
      })
      .finally(() => {
        setDetailLoading(false);
      });
  }, [current, online]);

  const closeDetails = useCallback(() => {
    setDetailOpen(false);
    setDetail(null);
    setDetailLoading(false);
  }, []);

  const platformOptions = Object.entries(platformFamilyLabels).filter(
    ([key]) => key !== 'OTHER',
  );

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-4 md:gap-6">
      <header>
        <h2 className="text-2xl font-semibold sm:text-3xl">Descubrir</h2>
        <p className="mt-2 text-sm text-ink-muted sm:text-base">
          Desliza la carta: → me interesa · ← descartar · ↑ compra segura · ↓ me lo pienso.
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
        <div className="relative mx-auto w-full max-w-md pb-4">
          <div
            className="relative overflow-hidden rounded-2xl border border-white/10 bg-surface-elevated shadow-2xl shadow-black/40"
            style={{
              transform: `translate3d(${offset.x}px, ${offset.y}px, 0) rotate(${offset.x / 28}deg)`,
              transition: drag.current.active ? 'none' : 'transform 180ms cubic-bezier(.2,.8,.2,1)',
              willChange: 'transform',
              boxShadow: activeGesture
                ? `0 0 0 1px ${decisionMeta[activeGesture].border}, 0 24px 48px ${decisionMeta[activeGesture].bg}`
                : undefined,
            }}
          >
            {activeGesture ? (
              <div
                className="pointer-events-none absolute inset-0 z-10 transition-opacity"
                style={{
                  background: decisionMeta[activeGesture].bg,
                  opacity: 0.35 + gestureStrength * 0.55,
                }}
                aria-hidden
              />
            ) : null}

            {activeGesture ? (
              <div
                className="pointer-events-none absolute left-1/2 top-5 z-20 -translate-x-1/2 rounded-full border px-3 py-1 text-sm font-semibold uppercase tracking-wide"
                style={{
                  color: decisionMeta[activeGesture].color,
                  borderColor: decisionMeta[activeGesture].border,
                  background: 'rgba(11, 18, 32, 0.72)',
                  opacity: Math.min(1, 0.4 + gestureStrength),
                }}
                aria-live="polite"
              >
                {decisionMeta[activeGesture].label}
              </div>
            ) : null}

            <div
              className="relative flex max-h-[min(42dvh,22rem)] min-h-[14rem] touch-none items-center justify-center overflow-hidden bg-surface sm:max-h-[26rem] sm:min-h-[18rem]"
              onPointerDown={onPointerDown}
              onPointerMove={onPointerMove}
              onPointerUp={onPointerUp}
              onPointerCancel={onPointerUp}
            >
              <CoverImage
                src={current.coverUrl || current.backgroundUrl}
                alt={`Portada de ${current.title}`}
                className="max-h-[min(42dvh,22rem)] w-full object-contain sm:max-h-[26rem]"
              />
              <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 via-black/45 to-transparent p-4 pt-16">
                <h3 className="text-xl font-semibold drop-shadow">{current.title}</h3>
                <p className="mt-1 text-sm text-white/85">{formatDateEs(current.releaseDate)}</p>
              </div>
            </div>
          </div>

          <div className="relative z-10 mt-3 space-y-3 rounded-2xl border border-white/10 bg-surface-elevated/80 p-4 text-sm">
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
              className="flex min-h-11 w-full items-center justify-center rounded-xl border border-accent/40 bg-accent/10 px-3 text-sm font-medium text-accent hover:bg-accent/15 disabled:opacity-50"
              disabled={!online || detailLoading}
              onPointerDown={(e) => e.stopPropagation()}
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                openDetails();
              }}
            >
              {detailLoading ? 'Cargando detalles…' : 'Ver detalles'}
            </button>
          </div>

          <div className="relative z-10 mt-4 grid grid-cols-5 gap-2">
            <ActionButton
              label="Descartar"
              icon={Ban}
              onClick={() => decide('DISMISSED')}
              disabled={!online || decideMutation.isPending || Boolean(leaving)}
              tone="danger"
              active={activeGesture === 'DISMISSED'}
            />
            <ActionButton
              label="Me lo pienso"
              icon={HelpCircle}
              onClick={() => decide('THINKING')}
              disabled={!online || decideMutation.isPending || Boolean(leaving)}
              tone="warning"
              active={activeGesture === 'THINKING'}
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
              disabled={!online || decideMutation.isPending || Boolean(leaving)}
              tone="accent"
              active={activeGesture === 'LIKED'}
            />
            <ActionButton
              label="Compra segura"
              icon={ShieldCheck}
              onClick={() => decide('MUST_BUY')}
              disabled={!online || decideMutation.isPending || Boolean(leaving)}
              tone="special"
              active={activeGesture === 'MUST_BUY'}
            />
          </div>
          <p className="mt-3 text-center text-[11px] text-ink-muted">
            Atajos: ← descartar · → interesa · ↑ compra segura · ↓ / M me lo pienso · Z deshacer
          </p>
        </div>
      ) : null}

      {detailOpen ? (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-3 sm:items-center"
          role="presentation"
          onClick={closeDetails}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-label={detail ? `Detalle de ${detail.title}` : 'Detalle del juego'}
            className="max-h-[85dvh] w-full max-w-lg overflow-y-auto rounded-2xl border border-white/10 bg-surface-elevated p-4"
            onClick={(e) => e.stopPropagation()}
            onPointerDown={(e) => e.stopPropagation()}
          >
            <div className="mb-3 flex items-start justify-between gap-3">
              <h3 className="text-lg font-semibold">{detail?.title ?? current?.title ?? 'Detalle'}</h3>
              <button
                type="button"
                className="min-h-10 rounded-lg px-2 text-sm text-ink-muted hover:bg-white/5"
                onClick={closeDetails}
              >
                Cerrar
              </button>
            </div>
            {detailLoading ? (
              <PageSkeleton label="Cargando detalles" />
            ) : detail?.description ? (
              <p className="whitespace-pre-wrap text-sm text-ink-muted">{detail.description}</p>
            ) : (
              <p className="text-sm text-ink-muted">Sin descripción.</p>
            )}
            {detail && !detailLoading ? (
              <p className="mt-3 text-xs text-ink-muted">
                {detail.developer ? `Dev: ${detail.developer}` : null}
                {detail.publisher ? ` · Pub: ${detail.publisher}` : null}
              </p>
            ) : null}
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
  active,
}: {
  label: string;
  icon: typeof Heart;
  onClick: () => void;
  disabled?: boolean;
  tone: 'danger' | 'warning' | 'accent' | 'special' | 'muted';
  active?: boolean;
}) {
  const tones = {
    danger: 'border-danger/40 text-danger',
    warning: 'border-warning/40 text-warning',
    accent: 'border-accent/40 text-accent',
    special: 'border-fuchsia-400/40 text-fuchsia-200',
    muted: 'border-white/15 text-ink-muted',
  };
  const activeTones = {
    danger: 'bg-danger/25 scale-105',
    warning: 'bg-warning/25 scale-105',
    accent: 'bg-accent/25 scale-105',
    special: 'bg-fuchsia-400/25 scale-105',
    muted: 'bg-white/10 scale-105',
  };
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      disabled={disabled}
      onClick={onClick}
      className={`flex min-h-14 flex-col items-center justify-center gap-1 rounded-xl border px-1 text-[10px] transition duration-150 disabled:opacity-40 ${tones[tone]} ${
        active ? activeTones[tone] : ''
      }`}
    >
      <Icon className="size-5" aria-hidden />
      <span className="leading-tight">{label}</span>
    </button>
  );
}
