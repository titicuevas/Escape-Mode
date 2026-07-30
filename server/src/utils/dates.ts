export function getMainDate(game: {
  releaseDate: Date | null;
  earlyAccessDate: Date | null;
  useEarlyAccessAsMainDate: boolean;
}): Date | null {
  if (game.useEarlyAccessAsMainDate && game.earlyAccessDate) {
    return game.earlyAccessDate;
  }
  return game.releaseDate ?? game.earlyAccessDate ?? null;
}

export function startOfDayUTC(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

export function addDaysUTC(date: Date, days: number): Date {
  const d = new Date(date);
  d.setUTCDate(d.getUTCDate() + days);
  return d;
}

export function daysUntil(target: Date, from: Date = new Date()): number {
  const a = startOfDayUTC(from).getTime();
  const b = startOfDayUTC(target).getTime();
  return Math.ceil((b - a) / (24 * 60 * 60 * 1000));
}

export function toDateOnlyString(date: Date | null | undefined): string | null {
  if (!date) return null;
  return date.toISOString().slice(0, 10);
}

export function parseDateOnly(value: string | null | undefined): Date | null {
  if (!value) return null;
  return new Date(`${value}T00:00:00.000Z`);
}
