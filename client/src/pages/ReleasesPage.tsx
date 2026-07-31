import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { api } from '../api/client';
import { GameCard } from '../components/GameCard';
import { EmptyState } from '../components/EmptyState';
import { PageSkeleton } from '../components/Skeleton';
import {
  interestStatusLabels,
  platformFamilyLabels,
  purchaseStatusLabels,
} from '@grc/shared';

const monthLabels = [
  'Enero',
  'Febrero',
  'Marzo',
  'Abril',
  'Mayo',
  'Junio',
  'Julio',
  'Agosto',
  'Septiembre',
  'Octubre',
  'Noviembre',
  'Diciembre',
];

const yearOptions = (() => {
  const current = new Date().getFullYear();
  return [current - 1, current, current + 1, current + 2, current + 3];
})();

const platformOptions = Object.entries(platformFamilyLabels).filter(([key]) => key !== 'OTHER');

export function ReleasesPage() {
  const [q, setQ] = useState('');
  const [platform, setPlatform] = useState('');
  const [interestStatus, setInterestStatus] = useState('');
  const [purchaseStatus, setPurchaseStatus] = useState('');
  const [year, setYear] = useState('');
  const [month, setMonth] = useState('');
  const [knownDate, setKnownDate] = useState('');
  const [unknownPrice, setUnknownPrice] = useState(false);
  const [reserved, setReserved] = useState(false);
  const [paid, setPaid] = useState(false);
  const [pendingPayment, setPendingPayment] = useState(false);

  const params = useMemo(
    () => ({
      q: q || undefined,
      platform: platform || undefined,
      interestStatus: interestStatus || undefined,
      purchaseStatus: purchaseStatus || undefined,
      year: year || undefined,
      month: month || undefined,
      knownDate: knownDate || undefined,
      unknownPrice: unknownPrice ? 'true' : undefined,
      reserved: reserved ? 'true' : undefined,
      paid: paid ? 'true' : undefined,
      pendingPayment: pendingPayment ? 'true' : undefined,
      sort: 'date',
      order: 'asc',
      pageSize: 48,
    }),
    [
      q,
      platform,
      interestStatus,
      purchaseStatus,
      year,
      month,
      knownDate,
      unknownPrice,
      reserved,
      paid,
      pendingPayment,
    ],
  );

  const { data, isLoading, isError } = useQuery({
    queryKey: ['games', 'releases', params],
    queryFn: () => api.listGames(params),
  });

  return (
    <div className="space-y-5 md:space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-2xl font-semibold sm:text-3xl">Próximos lanzamientos</h2>
          <p className="mt-2 text-sm text-ink-muted sm:text-base">
            Ordenados por fecha. Filtra por plataforma, interés o estado.
          </p>
        </div>
        <Link
          to="/games/new"
          className="inline-flex min-h-11 items-center rounded-lg bg-accent-strong px-3 py-2 text-sm font-semibold text-surface"
        >
          Añadir juego
        </Link>
      </header>

      <form
        className="grid gap-3 rounded-xl border border-white/10 bg-surface-elevated/50 p-3 sm:p-4 md:grid-cols-2 lg:grid-cols-4"
        onSubmit={(e) => e.preventDefault()}
      >
        <div>
          <label htmlFor="q" className="mb-1 block text-xs text-ink-muted">
            Buscar título
          </label>
          <input
            id="q"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            className="touch-field w-full rounded-lg border border-white/10 bg-surface px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label htmlFor="platform" className="mb-1 block text-xs text-ink-muted">
            Plataforma
          </label>
          <select
            id="platform"
            value={platform}
            onChange={(e) => setPlatform(e.target.value)}
            className="touch-field w-full rounded-lg border border-white/10 bg-surface px-3 py-2 text-sm"
          >
            <option value="">Todas</option>
            {platformOptions.map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="year" className="mb-1 block text-xs text-ink-muted">
            Año
          </label>
          <select
            id="year"
            value={year}
            onChange={(e) => setYear(e.target.value)}
            className="touch-field w-full rounded-lg border border-white/10 bg-surface px-3 py-2 text-sm"
          >
            <option value="">Todos</option>
            {yearOptions.map((y) => (
              <option key={y} value={String(y)}>
                {y}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="month" className="mb-1 block text-xs text-ink-muted">
            Mes
          </label>
          <select
            id="month"
            value={month}
            onChange={(e) => setMonth(e.target.value)}
            className="touch-field w-full rounded-lg border border-white/10 bg-surface px-3 py-2 text-sm"
          >
            <option value="">Todos</option>
            {monthLabels.map((label, i) => (
              <option key={label} value={String(i + 1)}>
                {label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="interest" className="mb-1 block text-xs text-ink-muted">
            Interés
          </label>
          <select
            id="interest"
            value={interestStatus}
            onChange={(e) => setInterestStatus(e.target.value)}
            className="touch-field w-full rounded-lg border border-white/10 bg-surface px-3 py-2 text-sm"
          >
            <option value="">Todos</option>
            {Object.entries(interestStatusLabels).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="purchase" className="mb-1 block text-xs text-ink-muted">
            Estado de compra
          </label>
          <select
            id="purchase"
            value={purchaseStatus}
            onChange={(e) => setPurchaseStatus(e.target.value)}
            className="touch-field w-full rounded-lg border border-white/10 bg-surface px-3 py-2 text-sm"
          >
            <option value="">Todos</option>
            {Object.entries(purchaseStatusLabels).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="knownDate" className="mb-1 block text-xs text-ink-muted">
            Fecha
          </label>
          <select
            id="knownDate"
            value={knownDate}
            onChange={(e) => setKnownDate(e.target.value)}
            className="touch-field w-full rounded-lg border border-white/10 bg-surface px-3 py-2 text-sm"
          >
            <option value="">Todas</option>
            <option value="true">Con fecha conocida</option>
            <option value="false">Sin fecha confirmada</option>
          </select>
        </div>
        <label className="flex items-end gap-2 pb-2 text-sm">
          <input
            type="checkbox"
            checked={unknownPrice}
            onChange={(e) => setUnknownPrice(e.target.checked)}
          />
          Precio desconocido
        </label>
        <label className="flex items-end gap-2 pb-2 text-sm">
          <input type="checkbox" checked={reserved} onChange={(e) => setReserved(e.target.checked)} />
          Reservado
        </label>
        <label className="flex items-end gap-2 pb-2 text-sm">
          <input type="checkbox" checked={paid} onChange={(e) => setPaid(e.target.checked)} />
          Pagado
        </label>
        <label className="flex items-end gap-2 pb-2 text-sm">
          <input
            type="checkbox"
            checked={pendingPayment}
            onChange={(e) => setPendingPayment(e.target.checked)}
          />
          Pago pendiente
        </label>
      </form>

      {isLoading ? <PageSkeleton /> : null}
      {isError ? (
        <p className="text-danger" role="alert">
          No se pudieron cargar los lanzamientos.
        </p>
      ) : null}

      {data && data.items.length === 0 ? (
        <EmptyState
          title="Sin resultados"
          description="Prueba a limpiar filtros o añade un juego nuevo."
        />
      ) : null}

      {data && data.items.length > 0 ? (
        <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 lg:grid-cols-4">
          {data.items.map((game) => (
            <GameCard key={game.id} game={game} />
          ))}
        </div>
      ) : null}
    </div>
  );
}
