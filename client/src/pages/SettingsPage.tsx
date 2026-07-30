import { useEffect, useState } from 'react';
import {
  budgetGroupingEnum,
  calendarViewEnum,
  platformFamilyLabels,
  type PlatformFamily,
  type PreferencesUpdateInput,
} from '@grc/shared';
import { useQueryClient } from '@tanstack/react-query';
import { PageSkeleton } from '../components/Skeleton';
import { useAuth } from '../providers/AuthProvider';
import { usePreferences } from '../providers/PreferencesProvider';
import { useOnline } from '../components/OfflineBanner';
import { api, ApiError } from '../api/client';

const platformOptions = Object.entries(platformFamilyLabels).filter(([key]) => key !== 'OTHER') as Array<
  [PlatformFamily, string]
>;

export function SettingsPage() {
  const { user, logout } = useAuth();
  const { preferences, isLoading, update } = usePreferences();
  const online = useOnline();
  const queryClient = useQueryClient();
  const [draft, setDraft] = useState<PreferencesUpdateInput | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [coverMsg, setCoverMsg] = useState<string | null>(null);
  const [covering, setCovering] = useState(false);

  useEffect(() => {
    if (!preferences) return;
    setDraft({
      preferredPlatforms: preferences.preferredPlatforms,
      defaultDiscoveryMonths: preferences.defaultDiscoveryMonths,
      defaultCalendarView: preferences.defaultCalendarView,
      defaultBudgetGrouping: preferences.defaultBudgetGrouping,
      hideDismissedGames: preferences.hideDismissedGames,
      reduceMotion: preferences.reduceMotion,
    });
  }, [preferences]);

  if (isLoading || !draft) return <PageSkeleton />;

  const togglePlatform = (platform: PlatformFamily) => {
    const current = draft.preferredPlatforms ?? [];
    const next = current.includes(platform)
      ? current.filter((p) => p !== platform)
      : [...current, platform];
    setDraft({ ...draft, preferredPlatforms: next });
    setSaved(false);
  };

  const onSave = async () => {
    if (!online) {
      setError('Sin conexión: no se pueden guardar los ajustes.');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await update(draft);
      setSaved(true);
    } catch {
      setError('No se pudieron guardar los ajustes.');
    } finally {
      setSaving(false);
    }
  };

  const onBackfillCovers = async () => {
    if (!online) {
      setError('Sin conexión: no se pueden buscar portadas.');
      return;
    }
    setCovering(true);
    setCoverMsg(null);
    setError(null);
    try {
      const result = await api.backfillCovers();
      await queryClient.invalidateQueries({ queryKey: ['games'] });
      await queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      setCoverMsg(
        result.updated > 0
          ? `Se actualizaron ${result.updated} portada(s).`
          : 'No había juegos sin portada (o RAWG no devolvió imagen).',
      );
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'No se pudieron rellenar las portadas.');
    } finally {
      setCovering(false);
    }
  };

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <header>
        <h2 className="text-2xl font-semibold sm:text-3xl">Ajustes</h2>
        <p className="mt-2 text-sm text-ink-muted sm:text-base">
          Preferencias personales. No se muestran secretos ni variables internas.
        </p>
      </header>

      <section className="space-y-2 rounded-xl border border-white/10 bg-surface-elevated/40 p-4">
        <h3 className="text-sm font-medium">Cuenta</h3>
        <p className="text-sm text-ink-muted">{user?.email}</p>
        <button
          type="button"
          className="min-h-11 rounded-lg border border-white/10 px-3 text-sm text-ink-muted hover:bg-white/5"
          onClick={() => void logout()}
        >
          Cerrar sesión
        </button>
      </section>

      <section className="space-y-3 rounded-xl border border-white/10 bg-surface-elevated/40 p-4">
        <h3 className="text-sm font-medium">Biblioteca</h3>
        <p className="text-sm text-ink-muted">
          Si ves monogramas en lugar de carátulas, rellena las portadas faltantes desde RAWG.
        </p>
        <button
          type="button"
          className="min-h-11 rounded-lg border border-accent/40 px-3 text-sm text-accent hover:bg-accent/10 disabled:opacity-50"
          disabled={covering || !online}
          onClick={() => void onBackfillCovers()}
        >
          {covering ? 'Buscando portadas…' : 'Rellenar portadas faltantes'}
        </button>
        {coverMsg ? (
          <p className="text-sm text-success" role="status">
            {coverMsg}
          </p>
        ) : null}
      </section>

      <section className="space-y-3 rounded-xl border border-white/10 bg-surface-elevated/40 p-4">
        <h3 className="text-sm font-medium">Plataformas preferidas</h3>
        <div className="flex flex-wrap gap-2">
          {platformOptions.map(([value, label]) => {
            const active = (draft.preferredPlatforms ?? []).includes(value);
            return (
              <button
                key={value}
                type="button"
                className={`min-h-10 rounded-lg px-2.5 py-1.5 text-xs ${
                  active ? 'bg-accent/20 text-accent' : 'border border-white/10 text-ink-muted'
                }`}
                aria-pressed={active}
                onClick={() => togglePlatform(value)}
              >
                {label}
              </button>
            );
          })}
        </div>
      </section>

      <section className="grid gap-4 rounded-xl border border-white/10 bg-surface-elevated/40 p-4 sm:grid-cols-2">
        <div>
          <label htmlFor="discovery-months" className="mb-1 block text-sm">
            Meses de descubrimiento
          </label>
          <input
            id="discovery-months"
            type="number"
            min={1}
            max={36}
            className="touch-field w-full rounded-lg border border-white/10 bg-surface px-3"
            value={draft.defaultDiscoveryMonths ?? 12}
            onChange={(e) => {
              setDraft({ ...draft, defaultDiscoveryMonths: Number(e.target.value) });
              setSaved(false);
            }}
          />
        </div>
        <div>
          <label htmlFor="calendar-view" className="mb-1 block text-sm">
            Vista de calendario
          </label>
          <select
            id="calendar-view"
            className="touch-field w-full rounded-lg border border-white/10 bg-surface px-3"
            value={draft.defaultCalendarView ?? 'MONTHLY'}
            onChange={(e) => {
              const value = calendarViewEnum.parse(e.target.value);
              setDraft({ ...draft, defaultCalendarView: value });
              setSaved(false);
            }}
          >
            <option value="MONTHLY">Mensual</option>
            <option value="TIMELINE">Línea temporal</option>
          </select>
        </div>
        <div>
          <label htmlFor="budget-grouping" className="mb-1 block text-sm">
            Agrupación de presupuesto
          </label>
          <select
            id="budget-grouping"
            className="touch-field w-full rounded-lg border border-white/10 bg-surface px-3"
            value={draft.defaultBudgetGrouping ?? 'RELEASE'}
            onChange={(e) => {
              const value = budgetGroupingEnum.parse(e.target.value);
              setDraft({ ...draft, defaultBudgetGrouping: value });
              setSaved(false);
            }}
          >
            <option value="RELEASE">Por lanzamiento</option>
            <option value="RESERVATION">Por reserva</option>
            <option value="PAYMENT">Por pago</option>
          </select>
        </div>
      </section>

      <section className="space-y-3 rounded-xl border border-white/10 bg-surface-elevated/40 p-4">
        <label className="flex min-h-11 items-center gap-3 text-sm">
          <input
            type="checkbox"
            checked={Boolean(draft.hideDismissedGames)}
            onChange={(e) => {
              setDraft({ ...draft, hideDismissedGames: e.target.checked });
              setSaved(false);
            }}
          />
          Ocultar descartados en listados generales
        </label>
        <label className="flex min-h-11 items-center gap-3 text-sm">
          <input
            type="checkbox"
            checked={Boolean(draft.reduceMotion)}
            onChange={(e) => {
              setDraft({ ...draft, reduceMotion: e.target.checked });
              setSaved(false);
            }}
          />
          Reducir animaciones
        </label>
      </section>

      {error ? (
        <p className="text-sm text-danger" role="alert">
          {error}
        </p>
      ) : null}
      {saved ? (
        <p className="text-sm text-success" role="status">
          Ajustes guardados.
        </p>
      ) : null}

      <button
        type="button"
        className="min-h-11 w-full rounded-lg bg-accent/20 px-4 text-sm font-medium text-accent disabled:opacity-50"
        disabled={saving || !online}
        onClick={() => void onSave()}
      >
        {saving ? 'Guardando…' : online ? 'Guardar ajustes' : 'Sin conexión'}
      </button>
    </div>
  );
}
