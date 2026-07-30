import type { Preferences, PreferencesUpdateInput } from '@grc/shared';
import { prisma } from '../config/prisma.js';

const defaults: Preferences = {
  preferredPlatforms: ['PLAYSTATION_5'],
  defaultDiscoveryMonths: 12,
  defaultCalendarView: 'MONTHLY',
  defaultBudgetGrouping: 'RELEASE',
  hideDismissedGames: true,
  reduceMotion: false,
};

function serialize(row: {
  preferredPlatforms: Preferences['preferredPlatforms'];
  defaultDiscoveryMonths: number;
  defaultCalendarView: Preferences['defaultCalendarView'];
  defaultBudgetGrouping: Preferences['defaultBudgetGrouping'];
  hideDismissedGames: boolean;
  reduceMotion: boolean;
}): Preferences {
  return {
    preferredPlatforms:
      row.preferredPlatforms.length > 0
        ? row.preferredPlatforms
        : defaults.preferredPlatforms,
    defaultDiscoveryMonths: row.defaultDiscoveryMonths,
    defaultCalendarView: row.defaultCalendarView,
    defaultBudgetGrouping: row.defaultBudgetGrouping,
    hideDismissedGames: row.hideDismissedGames,
    reduceMotion: row.reduceMotion,
  };
}

export async function getOrCreatePreferences(userId: string): Promise<Preferences> {
  const existing = await prisma.userPreferences.findUnique({ where: { userId } });
  if (existing) return serialize(existing);

  const created = await prisma.userPreferences.create({
    data: {
      userId,
      preferredPlatforms: defaults.preferredPlatforms,
      defaultDiscoveryMonths: defaults.defaultDiscoveryMonths,
      defaultCalendarView: defaults.defaultCalendarView,
      defaultBudgetGrouping: defaults.defaultBudgetGrouping,
      hideDismissedGames: defaults.hideDismissedGames,
      reduceMotion: defaults.reduceMotion,
    },
  });
  return serialize(created);
}

export async function updatePreferences(
  userId: string,
  input: PreferencesUpdateInput,
): Promise<Preferences> {
  await getOrCreatePreferences(userId);
  const updated = await prisma.userPreferences.update({
    where: { userId },
    data: {
      ...(input.preferredPlatforms !== undefined
        ? { preferredPlatforms: input.preferredPlatforms }
        : {}),
      ...(input.defaultDiscoveryMonths !== undefined
        ? { defaultDiscoveryMonths: input.defaultDiscoveryMonths }
        : {}),
      ...(input.defaultCalendarView !== undefined
        ? { defaultCalendarView: input.defaultCalendarView }
        : {}),
      ...(input.defaultBudgetGrouping !== undefined
        ? { defaultBudgetGrouping: input.defaultBudgetGrouping }
        : {}),
      ...(input.hideDismissedGames !== undefined
        ? { hideDismissedGames: input.hideDismissedGames }
        : {}),
      ...(input.reduceMotion !== undefined ? { reduceMotion: input.reduceMotion } : {}),
    },
  });
  return serialize(updated);
}
