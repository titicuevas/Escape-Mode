import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { GameCreateInput, PlatformFamily } from '@grc/shared';
import { GameForm } from '../features/games/GameForm';
import { api, ApiError } from '../api/client';
import type { RawgGameCard } from '../types/rawg';
import { formatDateEs } from '../utils/format';
import { CoverImage } from '../components/CoverImage';

function cardToDefaults(card: RawgGameCard, detail?: RawgGameCard): Partial<GameCreateInput> {
  const source = detail ?? card;
  return {
    title: source.title,
    rawgId: source.rawgId,
    slug: source.slug ?? undefined,
    coverUrl: source.coverUrl ?? undefined,
    backgroundUrl: source.backgroundUrl ?? undefined,
    releaseDate: source.releaseDate ?? undefined,
    dateSource: 'RAWG',
    platforms: source.platforms,
    normalizedPlatforms: source.normalizedPlatforms as PlatformFamily[],
    genres: source.genres,
    metacritic: source.metacritic ?? undefined,
    description: source.description ?? undefined,
    developer: source.developer ?? undefined,
    publisher: source.publisher ?? undefined,
    officialUrl: source.officialUrl ?? undefined,
    rawgUrl: source.rawgUrl ?? undefined,
    esrbRating: source.esrbRating ?? undefined,
    interestStatus: 'THINKING',
    purchaseStatus: 'UNRESERVED',
  };
}

export function GameNewPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [debounced, setDebounced] = useState('');
  const [defaults, setDefaults] = useState<Partial<GameCreateInput> | undefined>();
  const [formKey, setFormKey] = useState(0);
  const [selectedTitle, setSelectedTitle] = useState<string | null>(null);

  useEffect(() => {
    const t = window.setTimeout(() => setDebounced(search.trim()), 350);
    return () => window.clearTimeout(t);
  }, [search]);

  const searchQuery = useQuery({
    queryKey: ['rawg', 'search', debounced],
    enabled: debounced.length >= 2,
    queryFn: () => api.rawgSearch(debounced),
  });

  const mutation = useMutation({
    mutationFn: (values: GameCreateInput) =>
      api.createGame(values as unknown as Record<string, unknown>),
    onSuccess: async (data) => {
      await queryClient.invalidateQueries({ queryKey: ['games'] });
      await queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      navigate(`/games/${data.game.id}`);
    },
    onError: (err) => {
      setError(err instanceof ApiError ? err.message : 'No se pudo crear el juego');
    },
  });

  const applyCard = async (card: RawgGameCard) => {
    setError(null);
    try {
      const { game } = await api.rawgDetail(card.rawgId);
      setDefaults(cardToDefaults(card, game));
      setSelectedTitle(game.title);
      setFormKey((k) => k + 1);
      setSearch('');
      setDebounced('');
    } catch (err) {
      setDefaults(cardToDefaults(card));
      setSelectedTitle(card.title);
      setFormKey((k) => k + 1);
      setSearch('');
      setDebounced('');
      if (err instanceof ApiError) {
        setError(`Se aplicaron datos básicos; detalle RAWG no disponible: ${err.message}`);
      }
    }
  };

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <header>
        <h2 className="text-3xl font-semibold">Añadir juego</h2>
        <p className="mt-2 text-ink-muted">
          Busca en RAWG para rellenar el formulario, o créalo a mano.
        </p>
      </header>

      <section className="space-y-3 rounded-xl border border-white/10 bg-surface-elevated/40 p-4">
        <label htmlFor="rawg-search" className="block text-sm font-medium">
          Buscar en RAWG
        </label>
        <input
          id="rawg-search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Mínimo 2 caracteres…"
          className="w-full rounded-lg border border-white/10 bg-surface px-3 py-2.5"
          autoComplete="off"
        />
        {selectedTitle ? (
          <p className="text-sm text-accent">
            Prefill desde RAWG: <span className="font-medium">{selectedTitle}</span>
          </p>
        ) : null}
        {searchQuery.isFetching ? <p className="text-sm text-ink-muted">Buscando…</p> : null}
        {searchQuery.isError ? (
          <p className="text-sm text-danger" role="alert">
            No se pudo buscar en RAWG.
          </p>
        ) : null}
        {searchQuery.data && searchQuery.data.results.length === 0 ? (
          <p className="text-sm text-ink-muted">Sin resultados.</p>
        ) : null}
        {searchQuery.data && searchQuery.data.results.length > 0 ? (
          <ul className="divide-y divide-white/5 overflow-hidden rounded-lg border border-white/10">
            {searchQuery.data.results.slice(0, 8).map((item) => (
              <li key={item.rawgId}>
                <button
                  type="button"
                  className="flex min-h-14 w-full items-center gap-3 px-3 py-2 text-left hover:bg-white/5"
                  onClick={() => void applyCard(item)}
                >
                  <div className="h-12 w-9 shrink-0 overflow-hidden rounded bg-surface">
                    <CoverImage src={item.coverUrl} alt="" className="h-full w-full object-cover" />
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{item.title}</p>
                    <p className="truncate text-xs text-ink-muted">
                      {item.releaseDate ? formatDateEs(item.releaseDate) : 'Sin fecha'}
                      {item.platforms.length ? ` · ${item.platforms.slice(0, 3).join(', ')}` : ''}
                    </p>
                  </div>
                </button>
              </li>
            ))}
          </ul>
        ) : null}
      </section>

      {error ? (
        <p className="rounded-lg bg-danger/10 px-3 py-2 text-sm text-danger" role="alert">
          {error}
        </p>
      ) : null}
      <GameForm
        key={formKey}
        defaults={defaults}
        submitLabel="Guardar juego"
        onSubmit={async (values) => {
          setError(null);
          await mutation.mutateAsync(values);
        }}
      />
    </div>
  );
}
