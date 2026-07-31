import type { InterestStatus, MediaFormat, Prisma, PurchaseStatus } from '@prisma/client';
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

export type ImportResult = {
  created: number;
  updated: number;
  skipped: number;
  errors: string[];
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
      asDate(row.releaseDate) ?? (asDate(row.mainDate) && !row.earlyAccessDate ? asDate(row.mainDate) : null);
    const earlyAccessDate = asDate(row.earlyAccessDate);
    const amountPaid = asNumber(row.amountPaid) ?? 0;

    const data: Prisma.GameUncheckedCreateInput = {
      userId,
      title,
      rawgId: rawgIdInt ?? undefined,
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
      amountPaid: decimalFrom(amountPaid) ?? undefined,
      targetPrice: decimalFrom(asNumber(row.targetPrice)),
      notes: asString(row.notes),
      purchaseUrl: asString(row.purchaseUrl),
      useEarlyAccessAsMainDate: Boolean(row.useEarlyAccessAsMainDate),
      dateSource: releaseDate || earlyAccessDate ? 'MANUAL' : 'UNKNOWN',
    };

    try {
      if (existing) {
        await prisma.game.update({
          where: { id: existing.id },
          data: {
            title: data.title,
            rawgId: data.rawgId ?? existing.rawgId,
            coverUrl: data.coverUrl ?? existing.coverUrl,
            releaseDate: data.releaseDate ?? existing.releaseDate,
            earlyAccessDate: data.earlyAccessDate ?? existing.earlyAccessDate,
            interestStatus: data.interestStatus,
            purchaseStatus: data.purchaseStatus,
            mediaFormat: data.mediaFormat,
            selectedPlatform: data.selectedPlatform ?? existing.selectedPlatform,
            selectedEdition: data.selectedEdition ?? existing.selectedEdition,
            selectedStore: data.selectedStore ?? existing.selectedStore,
            totalPrice: data.totalPrice ?? existing.totalPrice,
            amountPaid: data.amountPaid ?? existing.amountPaid,
            targetPrice: data.targetPrice ?? existing.targetPrice,
            notes: data.notes ?? existing.notes,
            purchaseUrl: data.purchaseUrl ?? existing.purchaseUrl,
            useEarlyAccessAsMainDate: data.useEarlyAccessAsMainDate,
            dateSource:
              data.releaseDate || data.earlyAccessDate
                ? existing.dateSource === 'OFFICIAL'
                  ? 'OFFICIAL'
                  : 'MANUAL'
                : existing.dateSource,
          },
        });
        result.updated += 1;
      } else {
        await prisma.game.create({ data });
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
