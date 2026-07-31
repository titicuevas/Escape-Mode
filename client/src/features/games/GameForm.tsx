import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  gameCreateSchema,
  interestStatusLabels,
  mediaFormatLabels,
  purchaseStatusLabels,
  dateSourceLabels,
  STORE_OPTIONS,
  type GameCreateInput,
} from '@grc/shared';
import type { Game } from '../../types/game';

const interestOptions = Object.entries(interestStatusLabels) as Array<
  [GameCreateInput['interestStatus'], string]
>;
const purchaseOptions = Object.entries(purchaseStatusLabels) as Array<
  [GameCreateInput['purchaseStatus'], string]
>;
const mediaFormatOptions = Object.entries(mediaFormatLabels) as Array<
  [NonNullable<GameCreateInput['mediaFormat']>, string]
>;
const dateSourceOptions = Object.entries(dateSourceLabels) as Array<
  [GameCreateInput['dateSource'], string]
>;

function resolveStoreSelect(store: string | null | undefined): string {
  if (!store) return '';
  return (STORE_OPTIONS as readonly string[]).includes(store) ? store : 'Otra';
}

function gameToFormValues(game?: Game): GameCreateInput {
  if (!game) {
    return {
      title: '',
      platforms: [],
      normalizedPlatforms: [],
      genres: [],
      dateSource: 'MANUAL',
      interestStatus: 'THINKING',
      purchaseStatus: 'UNRESERVED',
      mediaFormat: 'UNKNOWN',
      includesBonus: false,
      useEarlyAccessAsMainDate: false,
    };
  }

  return {
    title: game.title,
    rawgId: game.rawgId ?? undefined,
    slug: game.slug,
    coverUrl: game.coverUrl ?? undefined,
    backgroundUrl: game.backgroundUrl ?? undefined,
    description: game.description,
    releaseDate: game.releaseDate ?? undefined,
    earlyAccessDate: game.earlyAccessDate ?? undefined,
    dateSource: game.dateSource,
    officialUrl: game.officialUrl ?? undefined,
    rawgUrl: game.rawgUrl ?? undefined,
    platforms: game.platforms,
    normalizedPlatforms: game.normalizedPlatforms,
    genres: game.genres,
    developer: game.developer,
    publisher: game.publisher,
    esrbRating: game.esrbRating,
    metacritic: game.metacritic ?? undefined,
    interestStatus: game.interestStatus,
    purchaseStatus: game.purchaseStatus,
    selectedPlatform: game.selectedPlatform,
    selectedEdition: game.selectedEdition,
    selectedStore: game.selectedStore,
    mediaFormat: game.mediaFormat ?? 'UNKNOWN',
    totalPrice: game.totalPrice ? Number(game.totalPrice) : undefined,
    targetPrice: game.targetPrice ? Number(game.targetPrice) : undefined,
    amountPaid: game.amountPaid ? Number(game.amountPaid) : undefined,
    reservationDate: game.reservationDate ?? undefined,
    paymentDeadline: game.paymentDeadline ?? undefined,
    orderNumber: game.orderNumber,
    purchaseUrl: game.purchaseUrl ?? undefined,
    includesBonus: game.includesBonus,
    bonusDescription: game.bonusDescription,
    useEarlyAccessAsMainDate: game.useEarlyAccessAsMainDate,
    notes: game.notes,
  };
}

export function GameForm({
  initial,
  defaults,
  submitLabel,
  onSubmit,
}: {
  initial?: Game;
  defaults?: Partial<GameCreateInput>;
  submitLabel: string;
  onSubmit: (values: GameCreateInput) => Promise<void>;
}) {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    watch,
    setValue,
  } = useForm<GameCreateInput>({
    resolver: zodResolver(gameCreateSchema),
    defaultValues: { ...gameToFormValues(initial), ...defaults },
  });

  const includesBonus = watch('includesBonus');
  const selectedStore = watch('selectedStore') ?? '';
  const storeSelect = resolveStoreSelect(selectedStore);
  const showCustomStore = storeSelect === 'Otra';

  return (
    <form
      className="space-y-6"
      onSubmit={handleSubmit(async (values) => {
        await onSubmit(values);
      })}
      noValidate
    >
      <section className="grid gap-4 md:grid-cols-2">
        <div className="md:col-span-2">
          <label htmlFor="title" className="mb-1.5 block text-sm">
            Título *
          </label>
          <input
            id="title"
            className="w-full rounded-lg border border-white/10 bg-surface px-3 py-2"
            {...register('title')}
          />
          {errors.title ? (
            <p className="mt-1 text-xs text-danger" role="alert">
              {errors.title.message}
            </p>
          ) : null}
        </div>

        <div>
          <label htmlFor="releaseDate" className="mb-1.5 block text-sm">
            Fecha de lanzamiento
          </label>
          <input
            id="releaseDate"
            type="date"
            className="w-full rounded-lg border border-white/10 bg-surface px-3 py-2"
            {...register('releaseDate')}
          />
        </div>

        <div>
          <label htmlFor="earlyAccessDate" className="mb-1.5 block text-sm">
            Acceso anticipado
          </label>
          <input
            id="earlyAccessDate"
            type="date"
            className="w-full rounded-lg border border-white/10 bg-surface px-3 py-2"
            {...register('earlyAccessDate')}
          />
        </div>

        <div className="flex items-center gap-2 md:col-span-2">
          <input
            id="useEarlyAccessAsMainDate"
            type="checkbox"
            className="size-4"
            {...register('useEarlyAccessAsMainDate')}
          />
          <label htmlFor="useEarlyAccessAsMainDate" className="text-sm">
            Usar acceso anticipado como fecha principal
          </label>
        </div>

        <div>
          <label htmlFor="dateSource" className="mb-1.5 block text-sm">
            Fuente de fecha
          </label>
          <select
            id="dateSource"
            className="w-full rounded-lg border border-white/10 bg-surface px-3 py-2"
            {...register('dateSource')}
          >
            {dateSourceOptions.map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="selectedPlatform" className="mb-1.5 block text-sm">
            Plataforma elegida
          </label>
          <input
            id="selectedPlatform"
            className="w-full rounded-lg border border-white/10 bg-surface px-3 py-2"
            placeholder="PlayStation 5"
            {...register('selectedPlatform')}
          />
        </div>

        <div>
          <label htmlFor="selectedEdition" className="mb-1.5 block text-sm">
            Edición
          </label>
          <input
            id="selectedEdition"
            className="w-full rounded-lg border border-white/10 bg-surface px-3 py-2"
            {...register('selectedEdition')}
          />
        </div>

        <div>
          <label htmlFor="interestStatus" className="mb-1.5 block text-sm">
            Interés
          </label>
          <select
            id="interestStatus"
            className="w-full rounded-lg border border-white/10 bg-surface px-3 py-2"
            {...register('interestStatus')}
          >
            {interestOptions.map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="purchaseStatus" className="mb-1.5 block text-sm">
            Estado de compra
          </label>
          <select
            id="purchaseStatus"
            className="w-full rounded-lg border border-white/10 bg-surface px-3 py-2"
            {...register('purchaseStatus')}
          >
            {purchaseOptions.map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="totalPrice" className="mb-1.5 block text-sm">
            Precio total (€)
          </label>
          <input
            id="totalPrice"
            type="number"
            step="0.01"
            min="0"
            className="w-full rounded-lg border border-white/10 bg-surface px-3 py-2"
            {...register('totalPrice')}
          />
        </div>

        <div>
          <label htmlFor="amountPaid" className="mb-1.5 block text-sm">
            Importe pagado (€)
          </label>
          <input
            id="amountPaid"
            type="number"
            step="0.01"
            min="0"
            className="w-full rounded-lg border border-white/10 bg-surface px-3 py-2"
            {...register('amountPaid')}
          />
        </div>

        <div>
          <label htmlFor="targetPrice" className="mb-1.5 block text-sm">
            Precio objetivo (€)
          </label>
          <input
            id="targetPrice"
            type="number"
            step="0.01"
            min="0"
            className="w-full rounded-lg border border-white/10 bg-surface px-3 py-2"
            {...register('targetPrice')}
          />
        </div>

        <div>
          <label htmlFor="reservationDate" className="mb-1.5 block text-sm">
            Fecha de reserva
          </label>
          <input
            id="reservationDate"
            type="date"
            className="w-full rounded-lg border border-white/10 bg-surface px-3 py-2"
            {...register('reservationDate')}
          />
        </div>

        <div>
          <label htmlFor="paymentDeadline" className="mb-1.5 block text-sm">
            Fecha límite de pago
          </label>
          <input
            id="paymentDeadline"
            type="date"
            className="w-full rounded-lg border border-white/10 bg-surface px-3 py-2"
            {...register('paymentDeadline')}
          />
        </div>

        <div>
          <label htmlFor="mediaFormat" className="mb-1.5 block text-sm">
            Formato
          </label>
          <select
            id="mediaFormat"
            className="w-full rounded-lg border border-white/10 bg-surface px-3 py-2"
            {...register('mediaFormat')}
          >
            {mediaFormatOptions.map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="selectedStoreSelect" className="mb-1.5 block text-sm">
            Tienda
          </label>
          <select
            id="selectedStoreSelect"
            className="w-full rounded-lg border border-white/10 bg-surface px-3 py-2"
            value={storeSelect}
            onChange={(e) => {
              const value = e.target.value;
              if (value === 'Otra') {
                setValue('selectedStore', selectedStore && storeSelect === 'Otra' ? selectedStore : '');
              } else if (value === '') {
                setValue('selectedStore', null);
              } else {
                setValue('selectedStore', value);
              }
            }}
          >
            <option value="">Sin especificar</option>
            {STORE_OPTIONS.map((store) => (
              <option key={store} value={store}>
                {store}
              </option>
            ))}
          </select>
          {showCustomStore ? (
            <input
              id="selectedStore"
              className="mt-2 w-full rounded-lg border border-white/10 bg-surface px-3 py-2"
              placeholder="Nombre de la tienda"
              {...register('selectedStore')}
            />
          ) : null}
        </div>

        <div>
          <label htmlFor="orderNumber" className="mb-1.5 block text-sm">
            Número de pedido
          </label>
          <input
            id="orderNumber"
            className="w-full rounded-lg border border-white/10 bg-surface px-3 py-2"
            {...register('orderNumber')}
          />
        </div>

        <div>
          <label htmlFor="purchaseUrl" className="mb-1.5 block text-sm">
            URL de compra / reserva
          </label>
          <input
            id="purchaseUrl"
            type="url"
            className="w-full rounded-lg border border-white/10 bg-surface px-3 py-2"
            {...register('purchaseUrl')}
          />
        </div>

        <div>
          <label htmlFor="coverUrl" className="mb-1.5 block text-sm">
            URL de portada
          </label>
          <input
            id="coverUrl"
            type="url"
            className="w-full rounded-lg border border-white/10 bg-surface px-3 py-2"
            {...register('coverUrl')}
          />
        </div>

        <div className="flex items-center gap-2">
          <input
            id="includesBonus"
            type="checkbox"
            className="size-4"
            {...register('includesBonus')}
            onChange={(e) => setValue('includesBonus', e.target.checked)}
          />
          <label htmlFor="includesBonus" className="text-sm">
            Incluye bonificación / Steelbook
          </label>
        </div>

        {includesBonus ? (
          <div>
            <label htmlFor="bonusDescription" className="mb-1.5 block text-sm">
              Descripción de la bonificación
            </label>
            <input
              id="bonusDescription"
              className="w-full rounded-lg border border-white/10 bg-surface px-3 py-2"
              {...register('bonusDescription')}
            />
          </div>
        ) : null}

        <div className="md:col-span-2">
          <label htmlFor="notes" className="mb-1.5 block text-sm">
            Nota personal
          </label>
          <textarea
            id="notes"
            rows={4}
            placeholder="Ej.: Steelbook en GAME, esperar oferta PSN, regalo de cumpleaños…"
            className="w-full rounded-lg border border-white/10 bg-surface px-3 py-2"
            {...register('notes')}
          />
          <p className="mt-1 text-xs text-ink-muted">Solo tú la ves. Ideal en español.</p>
        </div>

        <div className="md:col-span-2">
          <label htmlFor="description" className="mb-1.5 block text-sm">
            Descripción
          </label>
          <textarea
            id="description"
            rows={5}
            className="w-full rounded-lg border border-white/10 bg-surface px-3 py-2"
            {...register('description')}
          />
        </div>
      </section>

      <button
        type="submit"
        disabled={isSubmitting}
        className="rounded-lg bg-accent-strong px-4 py-2.5 text-sm font-semibold text-surface hover:bg-accent disabled:opacity-60"
      >
        {isSubmitting ? 'Guardando…' : submitLabel}
      </button>
    </form>
  );
}
