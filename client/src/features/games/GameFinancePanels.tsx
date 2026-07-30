import { useState, type ReactNode } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  STORE_OPTIONS,
  availabilityLabels,
  paymentTypeLabels,
} from '@grc/shared';
import { api, ApiError } from '../../api/client';
import { formatDateEs, formatEuro } from '../../utils/format';
import type { Game } from '../../types/game';

const PLATFORM_OPTIONS = ['PlayStation 5', 'Xbox Series', 'Nintendo Switch', 'PC', 'Otra'] as const;

export function GameFinancePanels({ game }: { game: Game }) {
  const queryClient = useQueryClient();
  const [paymentError, setPaymentError] = useState<string | null>(null);
  const [offerError, setOfferError] = useState<string | null>(null);
  const [customStore, setCustomStore] = useState(false);
  const [customPlatform, setCustomPlatform] = useState(false);

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
      setCustomStore(false);
      setCustomPlatform(false);
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

  const payments = paymentsQuery.data?.payments ?? [];
  const offers = offersQuery.data?.offers ?? [];

  return (
    <div className="space-y-6">
      <section className="grid gap-3 rounded-2xl border border-white/10 bg-surface-elevated/40 p-4 sm:grid-cols-3">
        <SummaryItem label="Precio total" value={formatEuro(game.totalPrice)} />
        <SummaryItem label="Ya pagado" value={formatEuro(game.amountPaid)} />
        <SummaryItem
          label="Pendiente"
          value={
            game.remainingAmount == null
              ? 'Sin precio total'
              : formatEuro(game.remainingAmount)
          }
        />
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="space-y-4 rounded-2xl border border-white/10 bg-surface-elevated/30 p-4">
          <header>
            <h3 className="font-display text-lg font-semibold">Pagos y reservas</h3>
            <p className="mt-1 text-sm text-ink-muted">
              Aquí anotas lo que ya has pagado (señal, plazos, reembolsos). Eso actualiza el
              «importe pagado» del juego.
            </p>
          </header>

          {paymentError ? (
            <p className="text-sm text-danger" role="alert">
              {paymentError}
            </p>
          ) : null}

          <details className="rounded-xl border border-white/10 bg-surface/40 open:pb-0" open={payments.length === 0}>
            <summary className="cursor-pointer list-none px-3 py-3 text-sm font-medium marker:content-none [&::-webkit-details-marker]:hidden">
              <span className="text-accent">+ Registrar un movimiento</span>
            </summary>
            <form
              className="grid gap-3 border-t border-white/10 p-3 sm:grid-cols-2"
              onSubmit={(e) => {
                e.preventDefault();
                const fd = new FormData(e.currentTarget);
                void createPayment
                  .mutateAsync({
                    amount: Number(fd.get('amount')),
                    paymentDate: String(fd.get('paymentDate') || '') || undefined,
                    paymentType: String(fd.get('paymentType')),
                    notes: String(fd.get('notes') || '') || null,
                  })
                  .then(() => e.currentTarget.reset());
              }}
            >
              <Field label="Importe (€)" htmlFor="amount">
                <input
                  id="amount"
                  name="amount"
                  type="number"
                  step="0.01"
                  min="0.01"
                  required
                  className="field"
                />
              </Field>
              <Field label="Fecha" htmlFor="paymentDate">
                <input id="paymentDate" name="paymentDate" type="date" className="field" />
              </Field>
              <Field label="Tipo" htmlFor="paymentType">
                <select id="paymentType" name="paymentType" className="field" defaultValue="PAYMENT">
                  {Object.entries(paymentTypeLabels).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Notas" htmlFor="notes">
                <input id="notes" name="notes" className="field" placeholder="Opcional" />
              </Field>
              <button
                type="submit"
                className="sm:col-span-2 min-h-11 rounded-xl bg-accent-strong px-3 text-sm font-semibold text-surface disabled:opacity-60"
                disabled={createPayment.isPending}
              >
                Guardar movimiento
              </button>
            </form>
          </details>

          {payments.length === 0 ? (
            <p className="rounded-xl border border-dashed border-white/15 px-3 py-4 text-sm text-ink-muted">
              Todavía no hay movimientos. Ejemplo: si pagaste 3 € de reserva de Wolverine, regístralos
              aquí como «Reserva».
            </p>
          ) : (
            <ul className="space-y-2">
              {payments.map((p) => (
                <li
                  key={p.id}
                  className="flex items-center justify-between gap-2 rounded-xl border border-white/10 px-3 py-2.5 text-sm"
                >
                  <div>
                    <p className="font-medium">
                      {paymentTypeLabels[p.paymentType]} · {formatEuro(p.amount)}
                    </p>
                    <p className="text-xs text-ink-muted">
                      {formatDateEs(p.paymentDate)}
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
            </ul>
          )}
        </section>

        <section className="space-y-4 rounded-2xl border border-white/10 bg-surface-elevated/30 p-4">
          <header>
            <h3 className="font-display text-lg font-semibold">Comparar tiendas</h3>
            <p className="mt-1 text-sm text-ink-muted">
              Apunta precios a mano (Amazon, GAME, PSN…) para ver cuál te conviene. No se actualizan
              solos: tú los introduces. Luego puedes «Elegir tienda» como la definitiva.
            </p>
            {game.targetPrice ? (
              <p className="mt-2 text-sm text-accent">
                Precio objetivo: {formatEuro(game.targetPrice)}
              </p>
            ) : null}
            {game.selectedStore ? (
              <p className="mt-1 text-sm text-ink-muted">
                Tienda elegida ahora: <span className="text-ink">{game.selectedStore}</span>
              </p>
            ) : null}
          </header>

          {offerError ? (
            <p className="text-sm text-danger" role="alert">
              {offerError}
            </p>
          ) : null}

          {offers.length === 0 ? (
            <p className="rounded-xl border border-dashed border-white/15 px-3 py-4 text-sm text-ink-muted">
              Sin comparaciones todavía. Úsalo solo si quieres contrastar varias tiendas; el precio
              principal del juego ya está en la ficha de arriba.
            </p>
          ) : (
            <ul className="space-y-2">
              {offers.map((o) => (
                <li
                  key={o.id}
                  className={`rounded-xl border px-3 py-3 text-sm ${
                    o.isLowestPrice ? 'border-accent/45 bg-accent/5' : 'border-white/10'
                  }`}
                >
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <p className="font-medium">
                        {o.store} · {formatEuro(o.finalPrice)}
                        {o.isLowestPrice ? (
                          <span className="ml-2 text-xs text-accent">Más barata</span>
                        ) : null}
                        {o.isSelectedStore ? (
                          <span className="ml-2 text-xs text-focus">Elegida</span>
                        ) : null}
                      </p>
                      <p className="mt-1 text-xs text-ink-muted">
                        {formatEuro(o.price)}
                        {Number(o.shippingCost) > 0 ? ` + envío ${formatEuro(o.shippingCost)}` : ''}
                        {' · '}
                        {availabilityLabels[o.availability]}
                        {o.edition ? ` · ${o.edition}` : ''}
                        {o.platform ? ` · ${o.platform}` : ''}
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        className="text-xs text-accent"
                        onClick={() => selectStore.mutate(o.store)}
                      >
                        Elegir
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
            </ul>
          )}

          <details className="rounded-xl border border-white/10 bg-surface/40">
            <summary className="cursor-pointer list-none px-3 py-3 text-sm font-medium marker:content-none [&::-webkit-details-marker]:hidden">
              <span className="text-accent">+ Añadir precio de otra tienda</span>
            </summary>
            <form
              className="grid gap-3 border-t border-white/10 p-3 sm:grid-cols-2"
              onSubmit={(e) => {
                e.preventDefault();
                const fd = new FormData(e.currentTarget);
                const storeSelect = String(fd.get('storeSelect') || '');
                const store =
                  storeSelect === 'Otra' ? String(fd.get('storeCustom') || '').trim() : storeSelect;
                const platformSelect = String(fd.get('platformSelect') || '');
                const platform =
                  platformSelect === 'Otra'
                    ? String(fd.get('platformCustom') || '').trim() || null
                    : platformSelect || null;

                if (!store) {
                  setOfferError('Elige una tienda');
                  return;
                }

                void createOffer
                  .mutateAsync({
                    store,
                    price: Number(fd.get('price')),
                    shippingCost: Number(fd.get('shippingCost') || 0),
                    edition: String(fd.get('edition') || '') || null,
                    platform,
                    url: String(fd.get('url') || '') || null,
                    availability: String(fd.get('availability') || 'UNKNOWN'),
                    includesBonus: fd.get('includesBonus') === 'on',
                    bonusDescription: String(fd.get('bonusDescription') || '') || null,
                  })
                  .then(() => {
                    e.currentTarget.reset();
                    setCustomStore(false);
                    setCustomPlatform(false);
                  });
              }}
            >
              <Field label="Tienda" htmlFor="storeSelect">
                <select
                  id="storeSelect"
                  name="storeSelect"
                  required
                  className="field"
                  defaultValue=""
                  onChange={(e) => setCustomStore(e.target.value === 'Otra')}
                >
                  <option value="" disabled>
                    Elige tienda
                  </option>
                  {STORE_OPTIONS.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </Field>
              {customStore ? (
                <Field label="Nombre de la tienda" htmlFor="storeCustom">
                  <input id="storeCustom" name="storeCustom" required className="field" />
                </Field>
              ) : (
                <div className="hidden sm:block" />
              )}

              <Field label="Precio (€)" htmlFor="price">
                <input
                  id="price"
                  name="price"
                  type="number"
                  step="0.01"
                  min="0"
                  required
                  className="field"
                />
              </Field>
              <Field label="Envío (€)" htmlFor="shippingCost">
                <input
                  id="shippingCost"
                  name="shippingCost"
                  type="number"
                  step="0.01"
                  min="0"
                  defaultValue={0}
                  className="field"
                />
              </Field>
              <Field label="Disponibilidad" htmlFor="availability">
                <select
                  id="availability"
                  name="availability"
                  className="field"
                  defaultValue="PREORDER"
                >
                  {Object.entries(availabilityLabels).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Formato / edición" htmlFor="edition">
                <select id="edition" name="edition" className="field" defaultValue="">
                  <option value="">Sin especificar</option>
                  <option value="Físico">Físico</option>
                  <option value="Digital">Digital</option>
                  <option value="Steelbook">Steelbook</option>
                  <option value="Ultimate">Ultimate</option>
                  <option value="Deluxe">Deluxe</option>
                </select>
              </Field>
              <Field label="Plataforma" htmlFor="platformSelect">
                <select
                  id="platformSelect"
                  name="platformSelect"
                  className="field"
                  defaultValue={game.selectedPlatform || 'PlayStation 5'}
                  onChange={(e) => setCustomPlatform(e.target.value === 'Otra')}
                >
                  {PLATFORM_OPTIONS.map((p) => (
                    <option key={p} value={p}>
                      {p}
                    </option>
                  ))}
                </select>
              </Field>
              {customPlatform ? (
                <Field label="Otra plataforma" htmlFor="platformCustom">
                  <input id="platformCustom" name="platformCustom" className="field" />
                </Field>
              ) : null}
              <div className="sm:col-span-2">
                <Field label="Enlace (opcional)" htmlFor="url">
                  <input id="url" name="url" type="url" className="field" placeholder="https://…" />
                </Field>
              </div>
              <label className="flex min-h-11 items-center gap-2 text-sm sm:col-span-2">
                <input type="checkbox" name="includesBonus" />
                Incluye bonificación / Steelbook
              </label>
              <div className="sm:col-span-2">
                <Field label="Detalle del bonus" htmlFor="bonusDescription">
                  <input id="bonusDescription" name="bonusDescription" className="field" />
                </Field>
              </div>
              <button
                type="submit"
                className="sm:col-span-2 min-h-11 rounded-xl bg-accent-strong px-3 text-sm font-semibold text-surface disabled:opacity-60"
                disabled={createOffer.isPending}
              >
                Guardar comparación
              </button>
            </form>
          </details>
        </section>
      </div>
    </div>
  );
}

function SummaryItem({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs uppercase tracking-[0.14em] text-ink-muted">{label}</p>
      <p className="mt-1 font-display text-xl font-semibold">{value}</p>
    </div>
  );
}

function Field({
  label,
  htmlFor,
  children,
}: {
  label: string;
  htmlFor: string;
  children: ReactNode;
}) {
  return (
    <div>
      <label htmlFor={htmlFor} className="mb-1 block text-xs text-ink-muted">
        {label}
      </label>
      {children}
    </div>
  );
}
