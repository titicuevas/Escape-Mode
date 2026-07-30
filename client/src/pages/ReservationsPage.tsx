import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { purchaseStatusLabels } from '@grc/shared';
import { api } from '../api/client';
import { EmptyState } from '../components/EmptyState';
import { PageSkeleton } from '../components/Skeleton';
import { ScrollTabs, TabButton } from '../components/ScrollTabs';
import { StatusBadge } from '../components/StatusBadge';
import { formatDateEs, formatEuro } from '../utils/format';
import type { PurchaseStatus } from '../types/game';

const tabs: Array<{ key: string; statuses: PurchaseStatus[]; label: string }> = [
  {
    key: 'pending',
    label: 'Pendientes',
    statuses: ['RESERVED', 'WAITING_OFFER'],
  },
  {
    key: 'partial',
    label: 'Parcialmente pagadas',
    statuses: ['PARTIALLY_PAID'],
  },
  {
    key: 'paid',
    label: 'Pagadas',
    statuses: ['PAID'],
  },
  {
    key: 'received',
    label: 'Recibidas',
    statuses: ['RECEIVED', 'PLAYING', 'COMPLETED'],
  },
  {
    key: 'cancelled',
    label: 'Canceladas',
    statuses: ['CANCELLED'],
  },
];

export function ReservationsPage() {
  const [tab, setTab] = useState(tabs[0]!.key);

  const { data, isLoading, isError } = useQuery({
    queryKey: ['games', 'reservations'],
    queryFn: () => api.listGames({ pageSize: 100, sort: 'updated', order: 'desc' }),
  });

  const current = tabs.find((t) => t.key === tab) ?? tabs[0]!;
  const items = useMemo(
    () => (data?.items ?? []).filter((g) => current.statuses.includes(g.purchaseStatus)),
    [data, current],
  );

  return (
    <div className="space-y-5 md:space-y-6">
      <header>
        <h2 className="text-2xl font-semibold sm:text-3xl">Reservas</h2>
        <p className="mt-2 text-sm text-ink-muted sm:text-base">
          Controla reservas, pagos parciales y el progreso de cada compra.
        </p>
      </header>

      <ScrollTabs label="Estados de reserva">
        {tabs.map((t) => (
          <TabButton key={t.key} selected={tab === t.key} onClick={() => setTab(t.key)}>
            {t.label}
          </TabButton>
        ))}
      </ScrollTabs>

      {isLoading ? <PageSkeleton /> : null}
      {isError ? (
        <p className="text-danger" role="alert">
          No se pudieron cargar las reservas.
        </p>
      ) : null}

      {!isLoading && items.length === 0 ? (
        <EmptyState
          title="Sin juegos en esta pestaña"
          description={`No hay partidas en «${current.label}».`}
        />
      ) : null}

      <div className="grid gap-3 sm:gap-4 md:grid-cols-2">
        {items.map((game) => {
          const paid = Number(game.amountPaid || 0);
          const total = game.totalPrice != null ? Number(game.totalPrice) : null;
          const progress =
            total && total > 0 ? Math.min(100, Math.round((paid / total) * 100)) : null;

          return (
            <article
              key={game.id}
              className="overflow-hidden rounded-xl border border-white/10 bg-surface-muted/40"
            >
              <div className="grid grid-cols-[88px_1fr] gap-3 p-3 sm:grid-cols-[100px_1fr]">
                <div className="aspect-[3/4] overflow-hidden rounded-lg bg-surface-elevated">
                  {game.coverUrl ? (
                    <img
                      src={game.coverUrl}
                      alt={`Portada de ${game.title}`}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center text-[10px] text-ink-muted">
                      Sin portada
                    </div>
                  )}
                </div>
                <div className="min-w-0 space-y-2 text-sm">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <Link
                      to={`/games/${game.id}`}
                      className="break-words font-semibold hover:text-accent"
                    >
                      {game.title}
                    </Link>
                    <StatusBadge purchase={game.purchaseStatus} />
                  </div>
                  <p className="text-xs text-ink-muted">
                    {game.selectedEdition || 'Edición estándar'} ·{' '}
                    {game.selectedPlatform || 'Sin plataforma'} · {game.selectedStore || 'Sin tienda'}
                  </p>
                  <p className="text-xs text-ink-muted">{formatDateEs(game.mainDate)}</p>
                  <p className="text-xs sm:text-sm">
                    Total: {formatEuro(game.totalPrice)}
                    <br className="sm:hidden" />
                    <span className="hidden sm:inline"> · </span>
                    Pagado: {formatEuro(game.amountPaid)}
                    <br className="sm:hidden" />
                    <span className="hidden sm:inline"> · </span>
                    Pendiente:{' '}
                    {game.remainingAmount == null
                      ? 'Precio pendiente de indicar'
                      : formatEuro(game.remainingAmount)}
                  </p>
                  {progress != null ? (
                    <div
                      className="h-2 overflow-hidden rounded-full bg-white/10"
                      role="progressbar"
                      aria-valuenow={progress}
                      aria-valuemin={0}
                      aria-valuemax={100}
                      aria-label={`Progreso de pago ${progress}%`}
                    >
                      <div className="h-full bg-accent" style={{ width: `${progress}%` }} />
                    </div>
                  ) : null}
                  {game.includesBonus ? (
                    <p className="text-xs text-accent">
                      Bonus: {game.bonusDescription || 'Incluye bonificación'}
                    </p>
                  ) : null}
                  {game.purchaseUrl ? (
                    <a
                      href={game.purchaseUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex min-h-10 items-center text-xs text-accent underline"
                    >
                      Enlace de compra
                    </a>
                  ) : null}
                  <p className="text-[10px] text-ink-muted">
                    {purchaseStatusLabels[game.purchaseStatus]}
                  </p>
                </div>
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
}
