import { z } from 'zod';
import { platformFamilyEnum } from './games.js';
import { budgetGroupingEnum } from './finance.js';

export const calendarViewEnum = z.enum(['MONTHLY', 'TIMELINE']);

export const preferencesSchema = z.object({
  preferredPlatforms: z.array(platformFamilyEnum).default(['PLAYSTATION_5']),
  defaultDiscoveryMonths: z.number().int().min(1).max(36).default(12),
  defaultCalendarView: calendarViewEnum.default('MONTHLY'),
  defaultBudgetGrouping: budgetGroupingEnum.default('RELEASE'),
  hideDismissedGames: z.boolean().default(true),
  reduceMotion: z.boolean().default(false),
});

export const preferencesUpdateSchema = preferencesSchema.partial();

export type Preferences = z.infer<typeof preferencesSchema>;
export type PreferencesUpdateInput = z.infer<typeof preferencesUpdateSchema>;
