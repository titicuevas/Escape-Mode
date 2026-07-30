import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { interestStatusLabels } from '@grc/shared';
import { api } from '../api/client';
import { GameCard } from '../components/GameCard';
import { EmptyState } from '../components/EmptyState';
import { PageSkeleton } from '../components/Skeleton';
import { ScrollTabs, TabButton } from '../components/ScrollTabs';
import type { InterestStatus } from '../types/game';

const tabs: InterestStatus[] = ['MUST_BUY', 'INTERESTED', 'THINKING', 'NOT_INTERESTED'];
type RecoverStatus = 'THINKING' | 'INTERESTED' | 'MUST_BUY';

export function InterestPage() {
  const [tab, setTab] = useState<InterestStatus>('MUST_BUY');
  const queryClient = useQueryClient();
  const isDismissed = tab === 'NOT_INTERESTED';

  const gamesQuery = useQuery({
    queryKey: ['games', 'interest', tab],
    enabled: !isDismissed,
    queryFn: () =>
      api.listGames({
        interestStatus: tab,
        pageSize: 100,
        sort: 'updated',
        order: 'desc',
      }),
  });

  const dismissedQuery = useQuery({
    queryKey: ['discovery', 'dismissed'],
    enabled: isDismissed,
    queryFn: () => api.listDismissed(),
  });

  const recoverMutation = useMutation({
    mutationFn: ({
      rawgId,
      interestStatus,
    }: {
      rawgId: number;
      interestStatus: RecoverStatus;
    }) => api.recoverDismissed({ rawgId, interestStatus }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['discovery'] });
      await queryClient.invalidateQueries({ queryKey: ['games'] });
      await queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });

  const title = useMemo(() => interestStatusLabels[tab], [tab]);
  const isLoading = isDismissed ? dismissedQuery.isLoading : gamesQuery.isLoading;
  const isError = isDismissed ? dismissedQuery.isError : gamesQuery.isError;
  const games = gamesQuery.data?.items ?? [];
  const dismissed = dismissedQuery.data?.items ?? [];
  const isEmpty = isDismissed ? dismissed.length === 0 : games.length === 0;

  return (
    <div className="space-y-5 md:space-y-6">
      <header>
        <h2 className="text-2xl font-semibold sm:text-3xl">Interés</h2>
        <p className="mt-2 text-sm text-ink-muted sm:text-base">
          Organiza tu colección. En Descartados puedes recuperar títulos rechazados en Descubrir.
        </p>
      </header>

      <ScrollTabs label="Niveles de interés">
        {tabs.map((value) => (
          <TabButton key={value} selected={tab === value} onClick={() => setTab(value)}>
            {interestStatusLabels[value]}
          </TabButton>
        ))}
      </ScrollTabs>

      <h3 className="text-lg font-medium">{title}</h3>

      {isLoading ? <PageSkeleton /> : null}
      {isError ? (
        <p className="text-danger" role="alert">
          No se pudo cargar la lista.
        </p>
      ) : null}

      {!isLoading && !isError && isEmpty ? (
        <EmptyState title="Lista vacía" description={`No hay juegos en «${title}».`} />
      ) : null}

      {!isDismissed && games.length > 0 ? (
        <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 lg:grid-cols-4">
          {games.map((game) => (
            <GameCard key={game.id} game={game} />
          ))}
        </div>
      ) : null}

      {isDismissed && dismissed.length > 0 ? (
        <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 lg:grid-cols-4">
          {dismissed.map((item) => (
            <article
              key={item.id}
              className="overflow-hidden rounded-xl border border-white/10 bg-surface-raised"
            >
              <div className="aspect-[3/4] bg-surface">
                {item.coverUrl ? (
                  <img
                    src={item.coverUrl}
                    alt=""
                    className="h-full w-full object-cover"
                    loading="lazy"
                  />
                ) : null}
              </div>
              <div className="space-y-2 p-3">
                <h4 className="line-clamp-2 text-sm font-medium">{item.title}</h4>
                <button
                  type="button"
                  className="min-h-11 w-full rounded-md border border-brand/40 px-2 text-xs text-brand"
                  disabled={recoverMutation.isPending}
                  onClick={() =>
                    recoverMutation.mutate({
                      rawgId: item.rawgId,
                      interestStatus: 'THINKING',
                    })
                  }
                >
                  Recuperar
                </button>
                {(['INTERESTED', 'MUST_BUY'] as RecoverStatus[]).map((status) => (
                  <button
                    key={status}
                    type="button"
                    className="min-h-10 w-full rounded-md border border-white/10 px-2 text-[10px] text-ink-muted hover:bg-white/5"
                    disabled={recoverMutation.isPending}
                    onClick={() =>
                      recoverMutation.mutate({
                        rawgId: item.rawgId,
                        interestStatus: status,
                      })
                    }
                  >
                    → {interestStatusLabels[status]}
                  </button>
                ))}
              </div>
            </article>
          ))}
        </div>
      ) : null}

      {recoverMutation.isError ? (
        <p className="text-sm text-danger" role="alert">
          No se pudo recuperar el juego.
        </p>
      ) : null}
    </div>
  );
}
