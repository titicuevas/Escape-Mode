import {
  interestStatusLabels,
  purchaseStatusLabels,
} from '@grc/shared';
import type { InterestStatus, PurchaseStatus } from '../types/game';

export function formatEuro(value: string | number | null | undefined): string {
  if (value == null || value === '') return 'Precio pendiente de indicar';
  const n = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(n)) return 'Precio pendiente de indicar';
  return new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(n);
}

export function formatDateEs(value: string | null | undefined): string {
  if (!value) return 'Sin fecha confirmada';
  const d = new Date(`${value}T00:00:00`);
  return new Intl.DateTimeFormat('es-ES', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(d);
}

export function interestLabel(status: InterestStatus): string {
  return interestStatusLabels[status];
}

export function purchaseLabel(status: PurchaseStatus): string {
  return purchaseStatusLabels[status];
}

export function interestTone(status: InterestStatus): string {
  switch (status) {
    case 'MUST_BUY':
      return 'bg-fuchsia-500/20 text-fuchsia-200 ring-fuchsia-400/30';
    case 'INTERESTED':
      return 'bg-sky-500/20 text-sky-200 ring-sky-400/30';
    case 'THINKING':
      return 'bg-amber-500/20 text-amber-100 ring-amber-400/30';
    case 'NOT_INTERESTED':
      return 'bg-slate-500/20 text-slate-300 ring-slate-400/30';
  }
}

export function purchaseTone(status: PurchaseStatus): string {
  switch (status) {
    case 'PAID':
    case 'RECEIVED':
    case 'COMPLETED':
      return 'bg-emerald-500/20 text-emerald-200 ring-emerald-400/30';
    case 'RESERVED':
    case 'PARTIALLY_PAID':
    case 'WAITING_OFFER':
      return 'bg-orange-500/20 text-orange-100 ring-orange-400/30';
    case 'CANCELLED':
      return 'bg-slate-500/20 text-slate-300 ring-slate-400/30';
    default:
      return 'bg-white/10 text-ink-muted ring-white/10';
  }
}
