import { useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { GameCreateInput } from '@grc/shared';
import { GameForm } from '../features/games/GameForm';
import { api, ApiError } from '../api/client';
import { PageSkeleton } from '../components/Skeleton';
import { useState } from 'react';

export function GameEditPage() {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [error, setError] = useState<string | null>(null);

  const query = useQuery({
    queryKey: ['games', id],
    queryFn: () => api.getGame(id),
    enabled: Boolean(id),
  });

  const mutation = useMutation({
    mutationFn: (values: GameCreateInput) =>
      api.updateGame(id, values as unknown as Record<string, unknown>),
    onSuccess: async (data) => {
      await queryClient.invalidateQueries({ queryKey: ['games', id] });
      await queryClient.invalidateQueries({ queryKey: ['games'] });
      await queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      navigate(`/games/${data.game.id}`);
    },
    onError: (err) => {
      setError(err instanceof ApiError ? err.message : 'No se pudo actualizar');
    },
  });

  if (query.isLoading) return <PageSkeleton />;
  if (!query.data) {
    return <p className="text-danger">No se encontró el juego.</p>;
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <header>
        <h2 className="text-3xl font-semibold">Editar juego</h2>
        <p className="mt-2 text-ink-muted">{query.data.game.title}</p>
      </header>
      {error ? (
        <p className="rounded-lg bg-danger/10 px-3 py-2 text-sm text-danger" role="alert">
          {error}
        </p>
      ) : null}
      <GameForm
        initial={query.data.game}
        submitLabel="Guardar cambios"
        onSubmit={async (values) => {
          setError(null);
          await mutation.mutateAsync(values);
        }}
      />
    </div>
  );
}
