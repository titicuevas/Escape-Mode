import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { api, ApiError } from '../api/client';
import { PageSkeleton } from '../components/Skeleton';
import { StatusBadge } from '../components/StatusBadge';
import { GameFinancePanels } from '../features/games/GameFinancePanels';
import { formatDateEs, formatEuro } from '../utils/format';
import { useState } from 'react';

export function GameDetailPage() {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [error, setError] = useState<string | null>(null);

  const query = useQuery({
    queryKey: ['games', id],
    queryFn: () => api.getGame(id),
    enabled: Boolean(id),
  });

  const deleteMutation = useMutation({
    mutationFn: () => api.deleteGame(id),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['games'] });
      await queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      navigate('/releases');
    },
    onError: (err) => {
      setError(err instanceof ApiError ? err.message : 'No se pudo eliminar');
    },
  });

  if (query.isLoading) return <PageSkeleton />;
  if (query.isError || !query.data) {
    return (
      <p className="text-danger" role="alert">
        No se pudo cargar el juego.
      </p>
    );
  }

  const { game } = query.data;

  return (
    <div className="space-y-5 md:space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm text-ink-muted">Ficha del juego</p>
          <h2 className="mt-1 text-2xl font-semibold break-words sm:text-3xl">{game.title}</h2>
          <div className="mt-3">
            <StatusBadge interest={game.interestStatus} purchase={game.purchaseStatus} />
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            to={`/games/${game.id}/edit`}
            className="rounded-lg border border-white/15 px-3 py-2 text-sm hover:bg-white/5"
          >
            Editar
          </Link>
          <button
            type="button"
            className="rounded-lg border border-danger/40 px-3 py-2 text-sm text-danger hover:bg-danger/10"
            onClick={() => {
              if (window.confirm(`¿Eliminar «${game.title}»? Esta acción no se puede deshacer.`)) {
                deleteMutation.mutate();
              }
            }}
          >
            Eliminar
          </button>
        </div>
      </div>

      {error ? (
        <p className="rounded-lg bg-danger/10 px-3 py-2 text-sm text-danger" role="alert">
          {error}
        </p>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-[200px_1fr] xl:grid-cols-[220px_1fr]">
        <div className="mx-auto w-40 overflow-hidden rounded-xl border border-white/10 bg-surface-elevated sm:w-48 lg:mx-0 lg:w-full">
          {game.coverUrl ? (
            <img src={game.coverUrl} alt={`Portada de ${game.title}`} className="w-full object-cover" />
          ) : (
            <div className="flex aspect-[3/4] items-center justify-center text-sm text-ink-muted">
              Sin portada
            </div>
          )}
        </div>

        <div className="space-y-4 text-sm">
          <dl className="grid gap-3 sm:grid-cols-2">
            <div>
              <dt className="text-ink-muted">Fecha principal</dt>
              <dd>{formatDateEs(game.mainDate)}</dd>
            </div>
            <div>
              <dt className="text-ink-muted">Fuente de la fecha</dt>
              <dd>{game.dateSource}</dd>
            </div>
            <div>
              <dt className="text-ink-muted">Plataforma</dt>
              <dd>{game.selectedPlatform || game.platforms.join(', ') || '—'}</dd>
            </div>
            <div>
              <dt className="text-ink-muted">Edición</dt>
              <dd>{game.selectedEdition || '—'}</dd>
            </div>
            <div>
              <dt className="text-ink-muted">Tienda</dt>
              <dd>{game.selectedStore || '—'}</dd>
            </div>
            <div>
              <dt className="text-ink-muted">Precio total</dt>
              <dd>{formatEuro(game.totalPrice)}</dd>
            </div>
            <div>
              <dt className="text-ink-muted">Pagado</dt>
              <dd>{formatEuro(game.amountPaid)}</dd>
            </div>
            <div>
              <dt className="text-ink-muted">Pendiente</dt>
              <dd>
                {game.remainingAmount == null
                  ? 'Precio pendiente de indicar'
                  : formatEuro(game.remainingAmount)}
              </dd>
            </div>
          </dl>

          {game.includesBonus ? (
            <p className="rounded-lg bg-accent/10 px-3 py-2 text-accent">
              Bonificación: {game.bonusDescription || 'Sí'}
            </p>
          ) : null}

          {game.description ? (
            <div>
              <h3 className="mb-1 font-medium">Descripción</h3>
              <p className="whitespace-pre-wrap text-ink-muted">{game.description}</p>
            </div>
          ) : null}

          {game.notes ? (
            <div>
              <h3 className="mb-1 font-medium">Notas</h3>
              <p className="whitespace-pre-wrap text-ink-muted">{game.notes}</p>
            </div>
          ) : null}

          {game.purchaseUrl ? (
            <a
              href={game.purchaseUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex text-accent underline-offset-2 hover:underline"
            >
              Abrir enlace de compra
            </a>
          ) : null}
        </div>
      </div>

      <GameFinancePanels game={game} />
    </div>
  );
}
