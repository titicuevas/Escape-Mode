import { useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameMonth,
  parseISO,
  startOfMonth,
  startOfWeek,
} from 'date-fns';
import { es } from 'date-fns/locale';
import { Link } from 'react-router-dom';
import { api } from '../api/client';
import { PageSkeleton } from '../components/Skeleton';
import { interestTone, purchaseTone } from '../utils/format';
import type { Game } from '../types/game';
import { usePreferences } from '../providers/PreferencesProvider';

type ViewMode = 'month' | 'timeline';

function groupByMonth(games: Game[]) {
  const dated: Game[] = [];
  const undated: Game[] = [];
  for (const g of games) {
    if (g.mainDate) dated.push(g);
    else undated.push(g);
  }
  dated.sort((a, b) => (a.mainDate! < b.mainDate! ? -1 : 1));

  const groups = new Map<string, Game[]>();
  for (const g of dated) {
    const key = g.mainDate!.slice(0, 7);
    const list = groups.get(key) ?? [];
    list.push(g);
    groups.set(key, list);
  }
  return { groups, undated };
}

export function CalendarPage() {
  const { preferences } = usePreferences();
  const [view, setView] = useState<ViewMode>(() =>
    preferences?.defaultCalendarView === 'TIMELINE' ? 'timeline' : 'month',
  );
  const [cursor, setCursor] = useState(() => startOfMonth(new Date()));
  const [prefsApplied, setPrefsApplied] = useState(false);

  useEffect(() => {
    if (prefsApplied || !preferences) return;
    setView(preferences.defaultCalendarView === 'TIMELINE' ? 'timeline' : 'month');
    setPrefsApplied(true);
  }, [preferences, prefsApplied]);

  const { data, isLoading, isError } = useQuery({
    queryKey: ['games', 'calendar'],
    queryFn: () => api.listGames({ pageSize: 200, sort: 'date', order: 'asc' }),
  });

  const gamesByDay = useMemo(() => {
    const map = new Map<string, Game[]>();
    for (const g of data?.items ?? []) {
      if (!g.mainDate) continue;
      const list = map.get(g.mainDate) ?? [];
      list.push(g);
      map.set(g.mainDate, list);
    }
    return map;
  }, [data]);

  const days = useMemo(() => {
    const start = startOfWeek(startOfMonth(cursor), { weekStartsOn: 1 });
    const end = endOfWeek(endOfMonth(cursor), { weekStartsOn: 1 });
    return eachDayOfInterval({ start, end });
  }, [cursor]);

  const timeline = useMemo(() => groupByMonth(data?.items ?? []), [data]);

  if (isLoading) return <PageSkeleton />;
  if (isError) {
    return (
      <p className="text-danger" role="alert">
        No se pudo cargar el calendario.
      </p>
    );
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="text-3xl font-semibold">Calendario</h2>
          <p className="mt-2 text-ink-muted">
            Usa la fecha principal (acceso anticipado si está activado).
          </p>
        </div>
        <div className="flex rounded-lg border border-white/10 p-1" role="tablist" aria-label="Vista">
          <button
            type="button"
            role="tab"
            aria-selected={view === 'month'}
            className={`rounded-md px-3 py-1.5 text-sm ${view === 'month' ? 'bg-accent/20 text-accent' : 'text-ink-muted'}`}
            onClick={() => setView('month')}
          >
            Mensual
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={view === 'timeline'}
            className={`rounded-md px-3 py-1.5 text-sm ${view === 'timeline' ? 'bg-accent/20 text-accent' : 'text-ink-muted'}`}
            onClick={() => setView('timeline')}
          >
            Línea temporal
          </button>
        </div>
      </header>

      {view === 'month' ? (
        <section className="space-y-3 sm:space-y-4">
          <div className="flex items-center justify-between gap-2">
            <button
              type="button"
              className="min-h-11 rounded-lg border border-white/10 px-3 py-1.5 text-sm"
              onClick={() => setCursor((d) => addMonths(d, -1))}
            >
              Ant.
            </button>
            <h3 className="text-base font-medium capitalize sm:text-lg">
              {format(cursor, 'MMMM yyyy', { locale: es })}
            </h3>
            <button
              type="button"
              className="min-h-11 rounded-lg border border-white/10 px-3 py-1.5 text-sm"
              onClick={() => setCursor((d) => addMonths(d, 1))}
            >
              Sig.
            </button>
          </div>

          <div className="grid grid-cols-7 gap-0.5 text-center text-[10px] text-ink-muted sm:gap-1 sm:text-xs">
            {['L', 'M', 'X', 'J', 'V', 'S', 'D'].map((d) => (
              <div key={d} className="py-1.5 sm:py-2">
                {d}
              </div>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-0.5 sm:gap-1">
            {days.map((day) => {
              const key = format(day, 'yyyy-MM-dd');
              const items = gamesByDay.get(key) ?? [];
              const inMonth = isSameMonth(day, cursor);
              return (
                <div
                  key={key}
                  className={`min-h-14 rounded-md border border-white/5 p-0.5 sm:min-h-24 sm:rounded-lg sm:p-1.5 ${inMonth ? 'bg-surface-muted/40' : 'bg-surface/40 opacity-50'}`}
                >
                  <div className="text-[10px] text-ink-muted sm:text-xs">{format(day, 'd')}</div>
                  {/* Móvil: puntos; tablet/desktop: títulos */}
                  <div className="mt-0.5 flex flex-wrap gap-0.5 sm:hidden">
                    {items.slice(0, 3).map((game) => (
                      <Link
                        key={game.id}
                        to={`/games/${game.id}`}
                        className={`size-1.5 rounded-full ${interestTone(game.interestStatus).split(' ')[0]}`}
                        title={game.title}
                        aria-label={game.title}
                      />
                    ))}
                  </div>
                  <ul className="mt-1 hidden space-y-1 sm:block">
                    {items.slice(0, 3).map((game) => (
                      <li key={game.id}>
                        <Link
                          to={`/games/${game.id}`}
                          className={`block truncate rounded px-1 py-0.5 text-[10px] ring-1 ${interestTone(game.interestStatus)} ${purchaseTone(game.purchaseStatus)}`}
                          title={game.title}
                        >
                          {game.title}
                        </Link>
                      </li>
                    ))}
                    {items.length > 3 ? (
                      <li className="text-[10px] text-ink-muted">+{items.length - 3}</li>
                    ) : null}
                  </ul>
                </div>
              );
            })}
          </div>
        </section>
      ) : (
        <section className="space-y-8">
          {[...timeline.groups.entries()].map(([month, games]) => (
            <div key={month}>
              <h3 className="mb-3 text-lg font-medium capitalize">
                {format(parseISO(`${month}-01`), 'MMMM yyyy', { locale: es })}
              </h3>
              <ul className="space-y-2">
                {games.map((game) => (
                  <li key={game.id}>
                    <Link
                      to={`/games/${game.id}`}
                      className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-white/10 px-3 py-2 text-sm hover:bg-white/5"
                    >
                      <span className="font-medium">{game.title}</span>
                      <span className="text-ink-muted">{game.mainDate}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}

          <div>
            <h3 className="mb-3 text-lg font-medium">Sin fecha confirmada</h3>
            {timeline.undated.length === 0 ? (
              <p className="text-sm text-ink-muted">No hay juegos sin fecha.</p>
            ) : (
              <ul className="space-y-2">
                {timeline.undated.map((game) => (
                  <li key={game.id}>
                    <Link
                      to={`/games/${game.id}`}
                      className="block rounded-lg border border-white/10 px-3 py-2 text-sm hover:bg-white/5"
                    >
                      {game.title}
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>
      )}
    </div>
  );
}
