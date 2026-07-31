import type {
  InterestStatus,
  MediaFormat,
  PaymentType,
  PurchaseStatus,
} from '@prisma/client';
import { prisma } from '../config/prisma.js';
import { AppError } from '../utils/errors.js';
import { decimalFrom } from '../utils/money.js';
import { parseDateOnly } from '../utils/dates.js';

const INTEREST = new Set([
  'INTERESTED',
  'THINKING',
  'NOT_INTERESTED',
  'MUST_BUY',
]);
const PURCHASE = new Set([
  'UNRESERVED',
  'WAITING_OFFER',
  'RESERVED',
  'PARTIALLY_PAID',
  'PAID',
  'CANCELLED',
  'RECEIVED',
  'PLAYING',
  'COMPLETED',
]);
const MEDIA = new Set(['PHYSICAL', 'DIGITAL', 'UNKNOWN']);
const PAYMENT_TYPES = new Set(['RESERVATION', 'PAYMENT', 'REFUND', 'ADJUSTMENT']);

export type ImportResult = {
  created: number;
  updated: number;
  skipped: number;
  errors: string[];
};

type ImportPayment = {
  amount?: unknown;
  paymentDate?: unknown;
  paymentType?: unknown;
  notes?: unknown;
};

type ImportGameRow = {
  title?: unknown;
  rawgId?: unknown;
  coverUrl?: unknown;
  releaseDate?: unknown;
  earlyAccessDate?: unknown;
  mainDate?: unknown;
  interestStatus?: unknown;
  purchaseStatus?: unknown;
  mediaFormat?: unknown;
  selectedPlatform?: unknown;
  selectedEdition?: unknown;
  selectedStore?: unknown;
  totalPrice?: unknown;
  amountPaid?: unknown;
  targetPrice?: unknown;
  notes?: unknown;
  purchaseUrl?: unknown;
  useEarlyAccessAsMainDate?: unknown;
  payments?: ImportPayment[];
};

function asString(v: unknown): string | null {
  if (v == null) return null;
  const s = String(v).trim();
  return s ? s : null;
}

function asNumber(v: unknown): number | null {
  if (v == null || v === '') return null;
  if (typeof v === 'number' && Number.isFinite(v)) return v;
  const n = Number(String(v).replace(',', '.'));
  return Number.isFinite(n) ? n : null;
}

function asDate(v: unknown): string | null {
  const s = asString(v);
  if (!s) return null;
  return /^\d{4}-\d{2}-\d{2}/.test(s) ? s.slice(0, 10) : null;
}

function asInterest(v: unknown): InterestStatus {
  const s = asString(v);
  return s && INTEREST.has(s) ? (s as InterestStatus) : 'THINKING';
}

function asPurchase(v: unknown): PurchaseStatus {
  const s = asString(v);
  return s && PURCHASE.has(s) ? (s as PurchaseStatus) : 'UNRESERVED';
}

function asMedia(v: unknown): MediaFormat {
  const s = asString(v);
  return s && MEDIA.has(s) ? (s as MediaFormat) : 'UNKNOWN';
}

/** true/false estricto; undefined si no viene o no se entiende. */
function asBool(v: unknown): boolean | undefined {
  if (v === undefined || v === null || v === '') return undefined;
  if (typeof v === 'boolean') return v;
  const s = String(v).trim().toLowerCase();
  if (['true', '1', 'yes', 'si', 'sí'].includes(s)) return true;
  if (['false', '0', 'no'].includes(s)) return false;
  return undefined;
}

function asPaymentType(v: unknown): PaymentType {
  const s = asString(v);
  return s && PAYMENT_TYPES.has(s) ? (s as PaymentType) : 'PAYMENT';
}

function parseCsv(text: string): ImportGameRow[] {
  const lines = text.replace(/^\uFEFF/, '').split(/\r?\n/).filter((l) => l.trim());
  if (lines.length < 2) return [];

  const parseLine = (line: string): string[] => {
    const out: string[] = [];
    let cur = '';
    let inQuotes = false;
    for (let i = 0; i < line.length; i += 1) {
      const ch = line[i]!;
      if (inQuotes) {
        if (ch === '"') {
          if (line[i + 1] === '"') {
            cur += '"';
            i += 1;
          } else {
            inQuotes = false;
          }
        } else {
          cur += ch;
        }
      } else if (ch === '"') {
        inQuotes = true;
      } else if (ch === ',') {
        out.push(cur);
        cur = '';
      } else {
        cur += ch;
      }
    }
    out.push(cur);
    return out;
  };

  const headers = parseLine(lines[0]!).map((h) => h.trim());
  const rows: ImportGameRow[] = [];
  for (const line of lines.slice(1)) {
    const cols = parseLine(line);
    const row: Record<string, string> = {};
    headers.forEach((h, i) => {
      row[h] = cols[i] ?? '';
    });
    rows.push(row);
  }
  return rows;
}

function extractGames(payload: unknown): ImportGameRow[] {
  if (typeof payload === 'string') {
    const trimmed = payload.trim();
    if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
      return extractGames(JSON.parse(trimmed) as unknown);
    }
    return parseCsv(trimmed);
  }
  if (Array.isArray(payload)) return payload as ImportGameRow[];
  if (payload && typeof payload === 'object' && Array.isArray((payload as { games?: unknown }).games)) {
    return (payload as { games: ImportGameRow[] }).games;
  }
  throw new AppError(400, 'Formato de importación no válido. Usa el JSON/CSV exportado.');
}

async function importPaymentsIfNeeded(
  gameId: string,
  payments: ImportPayment[] | undefined,
  onlyIfEmpty: boolean,
) {
  if (!payments?.length) return;
  if (onlyIfEmpty) {
    const count = await prisma.paymentHistory.count({ where: { gameId } });
    if (count > 0) return;
  }

  let sum = 0;
  for (const p of payments) {
    const amount = asNumber(p.amount);
    const paymentDate = asDate(p.paymentDate);
    if (amount == null || !paymentDate) continue;
    sum += amount;
    await prisma.paymentHistory.create({
      data: {
        gameId,
        amount: decimalFrom(amount)!,
        paymentDate: parseDateOnly(paymentDate)!,
        paymentType: asPaymentType(p.paymentType),
        notes: asString(p.notes),
      },
    });
  }

  if (sum > 0) {
    const paid = decimalFrom(sum);
    if (paid) {
      await prisma.game.update({
        where: { id: gameId },
        data: { amountPaid: paid },
      });
    }
  }
}

export async function importLibrary(
  userId: string,
  payload: unknown,
  mode: 'merge' | 'skip' = 'merge',
): Promise<ImportResult> {
  let rows: ImportGameRow[];
  try {
    rows = extractGames(payload);
  } catch (err) {
    if (err instanceof AppError) throw err;
    throw new AppError(400, 'No se pudo leer el archivo de importación.');
  }

  const result: ImportResult = { created: 0, updated: 0, skipped: 0, errors: [] };

  for (const row of rows) {
    const title = asString(row.title);
    if (!title) {
      result.errors.push('Fila sin título omitida');
      continue;
    }

    const rawgId = asNumber(row.rawgId);
    const rawgIdInt = rawgId != null && Number.isInteger(rawgId) ? rawgId : null;

    let existing = rawgIdInt
      ? await prisma.game.findFirst({ where: { userId, rawgId: rawgIdInt } })
      : null;
    if (!existing) {
      existing = await prisma.game.findFirst({ where: { userId, title } });
    }

    if (existing && mode === 'skip') {
      result.skipped += 1;
      continue;
    }

    const releaseDate =
      asDate(row.releaseDate) ??
      (asDate(row.mainDate) && !row.earlyAccessDate ? asDate(row.mainDate) : null);
    const earlyAccessDate = asDate(row.earlyAccessDate);
    const amountPaidValue = asNumber(row.amountPaid);
    const useEarly = asBool(row.useEarlyAccessAsMainDate);

    // Evitar choque unique(userId, rawgId) si otro juego ya lo tiene
    let safeRawgId: number | undefined = rawgIdInt ?? undefined;
    if (safeRawgId != null) {
      const clash = await prisma.game.findFirst({
        where: {
          userId,
          rawgId: safeRawgId,
          ...(existing ? { NOT: { id: existing.id } } : {}),
        },
        select: { id: true },
      });
      if (clash) safeRawgId = undefined;
    }

    try {
      if (existing) {
        await prisma.game.update({
          where: { id: existing.id },
          data: {
            // No pisar título si el match fue por rawgId y el export trae otro nombre
            title: existing.rawgId && rawgIdInt && existing.rawgId === rawgIdInt
              ? existing.title
              : title,
            rawgId: safeRawgId ?? existing.rawgId,
            coverUrl: asString(row.coverUrl) ?? existing.coverUrl,
            releaseDate: parseDateOnly(releaseDate ?? undefined) ?? existing.releaseDate,
            earlyAccessDate:
              earlyAccessDate !== null
                ? parseDateOnly(earlyAccessDate ?? undefined)
                : row.earlyAccessDate === null
                  ? null
                  : existing.earlyAccessDate,
            interestStatus: asInterest(row.interestStatus),
            purchaseStatus: asPurchase(row.purchaseStatus),
            mediaFormat: asMedia(row.mediaFormat),
            selectedPlatform: asString(row.selectedPlatform) ?? existing.selectedPlatform,
            selectedEdition: asString(row.selectedEdition) ?? existing.selectedEdition,
            selectedStore: asString(row.selectedStore) ?? existing.selectedStore,
            totalPrice:
              asNumber(row.totalPrice) != null
                ? (decimalFrom(asNumber(row.totalPrice)) ?? undefined)
                : undefined,
            ...(amountPaidValue != null
              ? { amountPaid: decimalFrom(amountPaidValue) ?? undefined }
              : {}),
            targetPrice:
              asNumber(row.targetPrice) != null
                ? (decimalFrom(asNumber(row.targetPrice)) ?? undefined)
                : undefined,
            notes: asString(row.notes) ?? existing.notes,
            purchaseUrl: asString(row.purchaseUrl) ?? existing.purchaseUrl,
            ...(useEarly !== undefined ? { useEarlyAccessAsMainDate: useEarly } : {}),
            dateSource:
              releaseDate || earlyAccessDate
                ? existing.dateSource === 'OFFICIAL'
                  ? 'OFFICIAL'
                  : 'MANUAL'
                : existing.dateSource,
          },
        });
        await importPaymentsIfNeeded(existing.id, row.payments, true);
        result.updated += 1;
      } else {
        const created = await prisma.game.create({
          data: {
            userId,
            title,
            rawgId: safeRawgId,
            coverUrl: asString(row.coverUrl),
            releaseDate: parseDateOnly(releaseDate ?? undefined),
            earlyAccessDate: parseDateOnly(earlyAccessDate ?? undefined),
            interestStatus: asInterest(row.interestStatus),
            purchaseStatus: asPurchase(row.purchaseStatus),
            mediaFormat: asMedia(row.mediaFormat),
            selectedPlatform: asString(row.selectedPlatform),
            selectedEdition: asString(row.selectedEdition),
            selectedStore: asString(row.selectedStore),
            totalPrice: decimalFrom(asNumber(row.totalPrice)),
            amountPaid: decimalFrom(amountPaidValue ?? 0) ?? undefined,
            targetPrice: decimalFrom(asNumber(row.targetPrice)),
            notes: asString(row.notes),
            purchaseUrl: asString(row.purchaseUrl),
            useEarlyAccessAsMainDate: useEarly ?? false,
            dateSource: releaseDate || earlyAccessDate ? 'MANUAL' : 'UNKNOWN',
          },
        });
        await importPaymentsIfNeeded(created.id, row.payments, false);
        result.created += 1;
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Error desconocido';
      result.errors.push(`${title}: ${msg}`);
    }
  }

  return result;
}

export async function importLibraryFromText(
  userId: string,
  text: string,
  mode: 'merge' | 'skip' = 'merge',
): Promise<ImportResult> {
  return importLibrary(userId, text, mode);
}
