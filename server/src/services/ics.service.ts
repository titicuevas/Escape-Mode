import { prisma } from '../config/prisma.js';
import { calculateRemainingAmount, toNumber } from '../utils/money.js';
import { getMainDate, toDateOnlyString } from '../utils/dates.js';

/** Escapa texto ICS (RFC 5545). */
export function icsEscape(value: string): string {
  return value
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\r\n/g, '\\n')
    .replace(/\n/g, '\\n')
    .replace(/\r/g, '\\n');
}

/** Pliega líneas a ~75 octetos. */
export function icsFold(line: string): string {
  if (line.length <= 75) return line;
  const parts: string[] = [];
  let rest = line;
  parts.push(rest.slice(0, 75));
  rest = rest.slice(75);
  while (rest.length > 0) {
    parts.push(` ${rest.slice(0, 74)}`);
    rest = rest.slice(74);
  }
  return parts.join('\r\n');
}

function formatDateOnly(date: Date): string {
  return toDateOnlyString(date)!.replace(/-/g, '');
}

function formatUtcStamp(date: Date): string {
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, '0');
  const d = String(date.getUTCDate()).padStart(2, '0');
  const hh = String(date.getUTCHours()).padStart(2, '0');
  const mm = String(date.getUTCMinutes()).padStart(2, '0');
  const ss = String(date.getUTCSeconds()).padStart(2, '0');
  return `${y}${m}${d}T${hh}${mm}${ss}Z`;
}

type IcsEvent = {
  uid: string;
  stamp: Date;
  start: Date;
  summary: string;
  description?: string;
  url?: string | null;
  categories?: string[];
};

function eventBlock(event: IcsEvent): string {
  const lines = [
    'BEGIN:VEVENT',
    `UID:${event.uid}`,
    `DTSTAMP:${formatUtcStamp(event.stamp)}`,
    `DTSTART;VALUE=DATE:${formatDateOnly(event.start)}`,
    `SUMMARY:${icsEscape(event.summary)}`,
  ];
  if (event.description) {
    lines.push(`DESCRIPTION:${icsEscape(event.description)}`);
  }
  if (event.url) {
    lines.push(`URL:${icsEscape(event.url)}`);
  }
  if (event.categories?.length) {
    lines.push(`CATEGORIES:${event.categories.map(icsEscape).join(',')}`);
  }
  lines.push('END:VEVENT');
  return lines.map(icsFold).join('\r\n');
}

function gameMeta(game: {
  selectedPlatform: string | null;
  platforms: string[];
  selectedEdition: string | null;
  selectedStore: string | null;
}): string {
  return [game.selectedPlatform || game.platforms[0] || null, game.selectedEdition, game.selectedStore]
    .filter(Boolean)
    .join(' · ');
}

/**
 * Calendario ICS: lanzamientos (fecha principal / early access) y plazos de pago.
 */
export async function exportLibraryIcs(userId: string): Promise<string> {
  const games = await prisma.game.findMany({
    where: {
      userId,
      interestStatus: { not: 'NOT_INTERESTED' },
      purchaseStatus: { not: 'CANCELLED' },
    },
    orderBy: { title: 'asc' },
  });

  const stamp = new Date();
  const events: IcsEvent[] = [];

  for (const game of games) {
    const meta = gameMeta(game);
    const main = getMainDate(game);
    const mainKey = toDateOnlyString(main);
    const earlyKey = toDateOnlyString(game.earlyAccessDate);
    const releaseKey = toDateOnlyString(game.releaseDate);

    if (main) {
      const mainIsEarly =
        Boolean(game.useEarlyAccessAsMainDate && earlyKey && earlyKey === mainKey);

      events.push({
        uid: `main-${game.id}@escape-mode`,
        stamp,
        start: main,
        summary: mainIsEarly
          ? `Acceso anticipado: ${game.title}`
          : `Lanzamiento: ${game.title}`,
        description: [meta || null, game.notes?.trim() || null, 'Escape Mode']
          .filter(Boolean)
          .join('\n'),
        url: game.purchaseUrl,
        categories: [mainIsEarly ? 'Early Access' : 'Lanzamiento', 'Escape Mode'],
      });
    }

    // Segunda fecha si early y release existen y son distintas
    if (earlyKey && releaseKey && earlyKey !== releaseKey) {
      if (mainKey === earlyKey && game.releaseDate) {
        events.push({
          uid: `release-${game.id}@escape-mode`,
          stamp,
          start: game.releaseDate,
          summary: `Lanzamiento: ${game.title}`,
          description: [meta || null, 'Escape Mode'].filter(Boolean).join('\n'),
          url: game.purchaseUrl,
          categories: ['Lanzamiento', 'Escape Mode'],
        });
      } else if (mainKey === releaseKey && game.earlyAccessDate) {
        events.push({
          uid: `early-${game.id}@escape-mode`,
          stamp,
          start: game.earlyAccessDate,
          summary: `Acceso anticipado: ${game.title}`,
          description: [meta || null, 'Escape Mode'].filter(Boolean).join('\n'),
          url: game.purchaseUrl,
          categories: ['Early Access', 'Escape Mode'],
        });
      }
    }

    if (game.paymentDeadline) {
      const remaining = calculateRemainingAmount(game.totalPrice, game.amountPaid);
      const remainingNum = remaining != null ? toNumber(remaining) : null;
      const inPaymentPipeline = ['RESERVED', 'PARTIALLY_PAID', 'WAITING_OFFER'].includes(
        game.purchaseStatus,
      );
      const stillOwes =
        (remainingNum != null && remainingNum > 0) ||
        (inPaymentPipeline && (remainingNum == null || remainingNum > 0));

      if (stillOwes) {
        events.push({
          uid: `payment-${game.id}@escape-mode`,
          stamp,
          start: game.paymentDeadline,
          summary: `Pago: ${game.title}`,
          description: [
            remainingNum != null
              ? `Pendiente: ${remainingNum.toFixed(2)} €`
              : 'Pendiente de indicar precio',
            meta || null,
            game.notes?.trim() || null,
            'Escape Mode',
          ]
            .filter(Boolean)
            .join('\n'),
          url: game.purchaseUrl,
          categories: ['Pago', 'Escape Mode'],
        });
      }
    }
  }

  events.sort(
    (a, b) => a.start.getTime() - b.start.getTime() || a.summary.localeCompare(b.summary, 'es'),
  );

  const header = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Escape Mode//Game Release Calendar//ES',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'X-WR-CALNAME:Escape Mode',
    'X-WR-CALDESC:Lanzamientos y plazos de pago',
  ];

  return `${[...header, ...events.map(eventBlock), 'END:VCALENDAR'].join('\r\n')}\r\n`;
}
