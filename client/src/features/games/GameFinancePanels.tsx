import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  SUGGESTED_STORES,
  availabilityLabels,
  paymentTypeLabels,
} from '@grc/shared';
import { api, ApiError } from '../../api/client';
import { formatEuro } from '../../utils/format';
import type { Game } from '../../types/game';

export function GameFinancePanels({ game }: { game: Game }) {
  const queryClient = useQueryClient();
  const [paymentError, setPaymentError] = useState<string | null>(null);
  const [offerError, setOfferError] = useState<string | null>(null);

  const paymentsQuery = useQuery({
    queryKey: ['payments', game.id],
    queryFn: () => api.listPayments(game.id),
  });

  const offersQuery = useQuery({
    queryKey: ['offers', game.id],
    queryFn: () => api.listOffers(game.id),
  });

  const invalidateAll = async () => {
    await queryClient.invalidateQueries({ queryKey: ['payments', game.id] });
    await queryClient.invalidateQueries({ queryKey: ['offers', game.id] });
    await queryClient.invalidateQueries({ queryKey: ['games', game.id] });
    await queryClient.invalidateQueries({ queryKey: ['games'] });
    await queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    await queryClient.invalidateQueries({ queryKey: ['budget'] });
  };

  const createPayment = useMutation({
    mutationFn: (body: Record<string, unknown>) => api.createPayment(game.id, body),
    onSuccess: async () => {
      setPaymentError(null);
      await invalidateAll();
    },
    onError: (err) => {
      setPaymentError(err instanceof ApiError ? err.message : 'No se pudo registrar el pago');
    },
  });

  const deletePayment = useMutation({
    mutationFn: (id: string) => api.deletePayment(id),
    onSuccess: async () => {
      await invalidateAll();
    },
  });

  const createOffer = useMutation({
    mutationFn: (body: Record<string, unknown>) => api.createOffer(game.id, body),
    onSuccess: async () => {
      setOfferError(null);
      await invalidateAll();
    },
    onError: (err) => {
      setOfferError(err instanceof ApiError ? err.message : 'No se pudo crear la oferta');
    },
  });

  const deleteOffer = useMutation({
    mutationFn: (id: string) => api.deleteOffer(id),
    onSuccess: async () => {
      await invalidateAll();
    },
  });

  const selectStore = useMutation({
    mutationFn: (store: string) => api.updateGame(game.id, { selectedStore: store }),
    onSuccess: async () => {
      await invalidateAll();
    },
  });

  return (
    <div className="grid gap-8 lg:grid-cols-2">
      <section className="space-y-4">
        <h3 className="text-lg font-semibold">Historial de pagos</h3>
        {paymentError ? (
          <p className="text-sm text-danger" role="alert">
            {paymentError}
          </p>
        ) : null}

        <form
          className="grid gap-2 rounded-xl border border-white/10 p-3 sm:grid-cols-2"
          onSubmit={(e) => {
            e.preventDefault();
            const fd = new FormData(e.currentTarget);
            void createPayment.mutateAsync({
              amount: Number(fd.get('amount')),
              paymentDate: String(fd.get('paymentDate') || '') || undefined,
              paymentType: String(fd.get('paymentType')),
              notes: String(fd.get('notes') || '') || null,
            }).then(() => e.currentTarget.reset());
          }}
        >
          <div>
            <label htmlFor="amount" className="mb-1 block text-xs text-ink-muted">
              Importe (€)
            </label>
            <input
              id="amount"
              name="amount"
              type="number"
              step="0.01"
              min="0.01"
              required
              className="w-full touch-field rounded-lg border border-white/10 bg-surface px-2 py-1.5 text-sm"
            />
          </div>
          <div>
            <label htmlFor="paymentDate" className="mb-1 block text-xs text-ink-muted">
              Fecha
            </label>
            <input
              id="paymentDate"
              name="paymentDate"
              type="date"
              className="w-full touch-field rounded-lg border border-white/10 bg-surface px-2 py-1.5 text-sm"
            />
          </div>
          <div>
            <label htmlFor="paymentType" className="mb-1 block text-xs text-ink-muted">
              Tipo
            </label>
            <select
              id="paymentType"
              name="paymentType"
              className="w-full touch-field rounded-lg border border-white/10 bg-surface px-2 py-1.5 text-sm"
              defaultValue="PAYMENT"
            >
              {Object.entries(paymentTypeLabels).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="notes" className="mb-1 block text-xs text-ink-muted">
              Notas
            </label>
            <input
              id="notes"
              name="notes"
              className="w-full touch-field rounded-lg border border-white/10 bg-surface px-2 py-1.5 text-sm"
            />
          </div>
          <button
            type="submit"
            className="sm:col-span-2 rounded-lg bg-accent-strong px-3 py-2 text-sm font-semibold text-surface"
            disabled={createPayment.isPending}
          >
            Registrar movimiento
          </button>
        </form>

        <ul className="space-y-2">
          {(paymentsQuery.data?.payments ?? []).map((p) => (
            <li
              key={p.id}
              className="flex items-center justify-between gap-2 rounded-lg border border-white/10 px-3 py-2 text-sm"
            >
              <div>
                <p className="font-medium">
                  {paymentTypeLabels[p.paymentType]} · {formatEuro(p.amount)}
                </p>
                <p className="text-xs text-ink-muted">
                  {p.paymentDate}
                  {p.notes ? ` · ${p.notes}` : ''}
                </p>
              </div>
              <button
                type="button"
                className="text-xs text-danger"
                onClick={() => {
                  if (window.confirm('¿Eliminar este movimiento?')) {
                    deletePayment.mutate(p.id);
                  }
                }}
              >
                Eliminar
              </button>
            </li>
          ))}
          {paymentsQuery.data?.payments.length === 0 ? (
            <li className="text-sm text-ink-muted">Sin movimientos todavía.</li>
          ) : null}
        </ul>
      </section>

      <section className="space-y-4">
        <h3 className="text-lg font-semibold">Comparador de ofertas</h3>
        {offerError ? (
          <p className="text-sm text-danger" role="alert">
            {offerError}
          </p>
        ) : null}
        {game.targetPrice ? (
          <p className="text-sm text-ink-muted">Precio objetivo: {formatEuro(game.targetPrice)}</p>
        ) : null}

        <form
          className="grid gap-2 rounded-xl border border-white/10 p-3 sm:grid-cols-2"
          onSubmit={(e) => {
            e.preventDefault();
            const fd = new FormData(e.currentTarget);
            void createOffer
              .mutateAsync({
                store: String(fd.get('store')),
                price: Number(fd.get('price')),
                shippingCost: Number(fd.get('shippingCost') || 0),
                edition: String(fd.get('edition') || '') || null,
                platform: String(fd.get('platform') || '') || null,
                url: String(fd.get('url') || '') || null,
                availability: String(fd.get('availability') || 'UNKNOWN'),
                includesBonus: fd.get('includesBonus') === 'on',
                bonusDescription: String(fd.get('bonusDescription') || '') || null,
              })
              .then(() => e.currentTarget.reset());
          }}
        >
          <div>
            <label htmlFor="store" className="mb-1 block text-xs text-ink-muted">
              Tienda
            </label>
            <input
              id="store"
              name="store"
              list="stores"
              required
              className="w-full touch-field rounded-lg border border-white/10 bg-surface px-2 py-1.5 text-sm"
            />
            <datalist id="stores">
              {SUGGESTED_STORES.map((s) => (
                <option key={s} value={s} />
              ))}
            </datalist>
          </div>
          <div>
            <label htmlFor="price" className="mb-1 block text-xs text-ink-muted">
              Precio (€)
            </label>
            <input
              id="price"
              name="price"
              type="number"
              step="0.01"
              min="0"
              required
              className="w-full touch-field rounded-lg border border-white/10 bg-surface px-2 py-1.5 text-sm"
            />
          </div>
          <div>
            <label htmlFor="shippingCost" className="mb-1 block text-xs text-ink-muted">
              Envío (€)
            </label>
            <input
              id="shippingCost"
              name="shippingCost"
              type="number"
              step="0.01"
              min="0"
              defaultValue={0}
              className="w-full touch-field rounded-lg border border-white/10 bg-surface px-2 py-1.5 text-sm"
            />
          </div>
          <div>
            <label htmlFor="availability" className="mb-1 block text-xs text-ink-muted">
              Disponibilidad
            </label>
            <select
              id="availability"
              name="availability"
              className="w-full touch-field rounded-lg border border-white/10 bg-surface px-2 py-1.5 text-sm"
              defaultValue="UNKNOWN"
            >
              {Object.entries(availabilityLabels).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="edition" className="mb-1 block text-xs text-ink-muted">
              Edición
            </label>
            <input
              id="edition"
              name="edition"
              className="w-full touch-field rounded-lg border border-white/10 bg-surface px-2 py-1.5 text-sm"
            />
          </div>
          <div>
            <label htmlFor="platform" className="mb-1 block text-xs text-ink-muted">
              Plataforma
            </label>
            <input
              id="platform"
              name="platform"
              className="w-full touch-field rounded-lg border border-white/10 bg-surface px-2 py-1.5 text-sm"
            />
          </div>
          <div className="sm:col-span-2">
            <label htmlFor="url" className="mb-1 block text-xs text-ink-muted">
              Enlace
            </label>
            <input
              id="url"
              name="url"
              type="url"
              className="w-full touch-field rounded-lg border border-white/10 bg-surface px-2 py-1.5 text-sm"
            />
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" name="includesBonus" />
            Incluye bonificación / Steelbook
          </label>
          <div>
            <label htmlFor="bonusDescription" className="mb-1 block text-xs text-ink-muted">
              Bonus
            </label>
            <input
              id="bonusDescription"
              name="bonusDescription"
              className="w-full touch-field rounded-lg border border-white/10 bg-surface px-2 py-1.5 text-sm"
            />
          </div>
          <button
            type="submit"
            className="sm:col-span-2 rounded-lg bg-accent-strong px-3 py-2 text-sm font-semibold text-surface"
            disabled={createOffer.isPending}
          >
            Añadir oferta
          </button>
        </form>

        <ul className="space-y-2">
          {(offersQuery.data?.offers ?? []).map((o) => (
            <li
              key={o.id}
              className={`rounded-lg border px-3 py-2 text-sm ${
                o.isLowestPrice ? 'border-accent/50 bg-accent/5' : 'border-white/10'
              }`}
            >
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <p className="font-medium">
                    {o.store} · {formatEuro(o.finalPrice)}
                    {o.isLowestPrice ? (
                      <span className="ml-2 text-xs text-accent">Menor precio</span>
                    ) : null}
                    {o.isSelectedStore ? (
                      <span className="ml-2 text-xs text-focus">Seleccionada</span>
                    ) : null}
                    {o.targetReached ? (
                      <span className="ml-2 text-xs text-success">Objetivo alcanzado</span>
                    ) : null}
                  </p>
                  <p className="text-xs text-ink-muted">
                    {formatEuro(o.price)} + envío {formatEuro(o.shippingCost)} ·{' '}
                    {availabilityLabels[o.availability]}
                    {o.includesBonus ? ` · ${o.bonusDescription || 'Con bonus'}` : ''}
                  </p>
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    className="text-xs text-accent"
                    onClick={() => selectStore.mutate(o.store)}
                  >
                    Elegir tienda
                  </button>
                  {o.url ? (
                    <a
                      href={o.url}
                      target="_blank"
                      rel="noreferrer"
                      className="text-xs text-ink-muted underline"
                    >
                      Abrir
                    </a>
                  ) : null}
                  <button
                    type="button"
                    className="text-xs text-danger"
                    onClick={() => {
                      if (window.confirm('¿Eliminar esta oferta?')) deleteOffer.mutate(o.id);
                    }}
                  >
                    Eliminar
                  </button>
                </div>
              </div>
            </li>
          ))}
          {offersQuery.data?.offers.length === 0 ? (
            <li className="text-sm text-ink-muted">Sin ofertas manuales todavía.</li>
          ) : null}
        </ul>
      </section>
    </div>
  );
}
