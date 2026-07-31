import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { useState } from 'react';
import { api, ApiError } from '../api/client';
import { PageSkeleton } from '../components/Skeleton';
import { EmptyState } from '../components/EmptyState';
import { CoverImage } from '../components/CoverImage';
import { formatDateEs } from '../utils/format';

export function ListsPage() {
  const queryClient = useQueryClient();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [addGameId, setAddGameId] = useState('');

  const listsQuery = useQuery({
    queryKey: ['lists'],
    queryFn: () => api.listGameLists(),
  });

  const detailQuery = useQuery({
    queryKey: ['lists', selectedId],
    queryFn: () => api.getGameList(selectedId!),
    enabled: Boolean(selectedId),
  });

  const gamesQuery = useQuery({
    queryKey: ['games', 'for-lists'],
    queryFn: () => api.listGames({ pageSize: 200, sort: 'title' }),
  });

  const createMutation = useMutation({
    mutationFn: () => api.createGameList({ name }),
    onSuccess: async (data) => {
      setName('');
      setError(null);
      await queryClient.invalidateQueries({ queryKey: ['lists'] });
      setSelectedId(data.list.id);
    },
    onError: (err) => setError(err instanceof ApiError ? err.message : 'No se pudo crear'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.deleteGameList(id),
    onSuccess: async () => {
      setSelectedId(null);
      await queryClient.invalidateQueries({ queryKey: ['lists'] });
    },
  });

  const addMutation = useMutation({
    mutationFn: () => api.addGameToList(selectedId!, { gameId: addGameId }),
    onSuccess: async () => {
      setAddGameId('');
      await queryClient.invalidateQueries({ queryKey: ['lists', selectedId] });
      await queryClient.invalidateQueries({ queryKey: ['lists'] });
    },
    onError: (err) => setError(err instanceof ApiError ? err.message : 'No se pudo añadir'),
  });

  const removeMutation = useMutation({
    mutationFn: (gameId: string) => api.removeGameFromList(selectedId!, gameId),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['lists', selectedId] });
      await queryClient.invalidateQueries({ queryKey: ['lists'] });
    },
  });

  if (listsQuery.isLoading) return <PageSkeleton label="Cargando listas" />;

  const lists = listsQuery.data?.lists ?? [];
  const detail = detailQuery.data?.list;
  const games = gamesQuery.data?.items ?? [];

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <header>
        <h2 className="text-2xl font-semibold sm:text-3xl">Listas</h2>
        <p className="mt-2 text-sm text-ink-muted">
          Agrupa juegos a tu manera: vacaciones, físicos, con amigos…
        </p>
      </header>

      {error ? (
        <p className="rounded-lg bg-danger/10 px-3 py-2 text-sm text-danger" role="alert">
          {error}
        </p>
      ) : null}

      <form
        className="flex flex-wrap gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          if (!name.trim()) return;
          createMutation.mutate();
        }}
      >
        <input
          className="touch-field min-w-[12rem] flex-1 rounded-lg border border-white/10 bg-surface px-3"
          placeholder="Nombre de la lista"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <button
          type="submit"
          className="min-h-11 rounded-lg bg-accent/20 px-4 text-sm font-medium text-accent"
          disabled={createMutation.isPending}
        >
          Crear lista
        </button>
      </form>

      <div className="grid gap-6 lg:grid-cols-[16rem_1fr]">
        <aside className="space-y-2">
          {lists.length === 0 ? (
            <EmptyState title="Sin listas" description="Crea la primera para organizar tu biblioteca." />
          ) : (
            lists.map((list) => (
              <button
                key={list.id}
                type="button"
                className={`flex w-full items-center justify-between rounded-xl border px-3 py-2.5 text-left text-sm ${
                  selectedId === list.id
                    ? 'border-accent/40 bg-accent/10 text-accent'
                    : 'border-white/10 text-ink-muted hover:bg-white/5'
                }`}
                onClick={() => setSelectedId(list.id)}
              >
                <span className="font-medium text-ink">{list.name}</span>
                <span className="text-xs">{list.itemCount}</span>
              </button>
            ))
          )}
        </aside>

        <section className="rounded-2xl border border-white/10 bg-surface-elevated/40 p-4">
          {!selectedId ? (
            <p className="text-sm text-ink-muted">Elige una lista o crea una nueva.</p>
          ) : detailQuery.isLoading || !detail ? (
            <PageSkeleton label="Cargando lista" />
          ) : (
            <div className="space-y-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h3 className="font-display text-xl font-semibold">{detail.name}</h3>
                  {detail.description ? (
                    <p className="mt-1 text-sm text-ink-muted">{detail.description}</p>
                  ) : null}
                </div>
                <button
                  type="button"
                  className="text-sm text-danger"
                  onClick={() => {
                    if (window.confirm(`¿Eliminar la lista «${detail.name}»?`)) {
                      deleteMutation.mutate(detail.id);
                    }
                  }}
                >
                  Eliminar lista
                </button>
              </div>

              <form
                className="flex flex-wrap gap-2"
                onSubmit={(e) => {
                  e.preventDefault();
                  if (!addGameId) return;
                  addMutation.mutate();
                }}
              >
                <select
                  className="touch-field min-w-[12rem] flex-1 rounded-lg border border-white/10 bg-surface px-3 text-sm"
                  value={addGameId}
                  onChange={(e) => setAddGameId(e.target.value)}
                >
                  <option value="">Añadir juego…</option>
                  {games.map((g) => (
                    <option key={g.id} value={g.id}>
                      {g.title}
                    </option>
                  ))}
                </select>
                <button
                  type="submit"
                  className="min-h-11 rounded-lg border border-accent/40 px-3 text-sm text-accent"
                  disabled={!addGameId || addMutation.isPending}
                >
                  Añadir
                </button>
              </form>

              {(detail.items ?? []).length === 0 ? (
                <p className="text-sm text-ink-muted">Esta lista está vacía.</p>
              ) : (
                <ul className="grid gap-3 sm:grid-cols-2">
                  {(detail.items ?? []).map((item) => (
                    <li
                      key={item.id}
                      className="flex gap-3 rounded-xl border border-white/10 bg-surface/60 p-2"
                    >
                      <div className="h-20 w-14 shrink-0 overflow-hidden rounded-lg">
                        <CoverImage
                          src={item.game.coverUrl}
                          title={item.game.title}
                          alt=""
                        />
                      </div>
                      <div className="min-w-0 flex-1">
                        <Link to={`/games/${item.game.id}`} className="font-medium hover:text-accent">
                          {item.game.title}
                        </Link>
                        <p className="text-xs text-ink-muted">
                          {formatDateEs(item.game.mainDate)} · añadido {formatDateEs(item.addedAt.slice(0, 10))}
                        </p>
                        <button
                          type="button"
                          className="mt-2 text-xs text-danger"
                          onClick={() => removeMutation.mutate(item.game.id)}
                        >
                          Quitar
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
