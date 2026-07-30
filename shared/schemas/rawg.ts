import { z } from 'zod';
import { platformFamilyEnum } from './games.js';

export const discoveryDecisionEnum = z.enum(['LIKED', 'THINKING', 'DISMISSED', 'MUST_BUY']);

export const rawgSearchQuerySchema = z.object({
  query: z
    .string()
    .trim()
    .min(2, 'La búsqueda debe tener al menos 2 caracteres')
    .max(100, 'La búsqueda es demasiado larga'),
});

export const rawgDiscoverQuerySchema = z.object({
  platforms: z
    .string()
    .optional()
    .transform((v) =>
      v
        ? v
            .split(',')
            .map((p) => p.trim())
            .filter(Boolean)
        : undefined,
    )
    .pipe(z.array(platformFamilyEnum).optional()),
  dateFrom: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
  dateTo: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
  genres: z.string().optional(),
  ordering: z.enum(['released', '-released', '-rating', '-metacritic', 'name']).default('released'),
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(20).default(12),
  requireDate: z
    .enum(['true', 'false'])
    .optional()
    .transform((v) => (v === undefined ? true : v === 'true')),
});

const optionalHttpUrl = z
  .union([z.string().url(), z.literal(''), z.null()])
  .optional()
  .transform((v) => (v ? v : null));

export const discoveryDecideSchema = z.object({
  rawgId: z.number().int().positive(),
  title: z.string().trim().min(1).max(300),
  slug: z.string().max(300).optional().nullable(),
  coverUrl: optionalHttpUrl,
  backgroundUrl: optionalHttpUrl,
  releaseDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional()
    .nullable(),
  platforms: z.array(z.string()).default([]),
  genres: z.array(z.string()).default([]),
  decision: discoveryDecisionEnum,
  description: z.string().max(10000).optional().nullable(),
  metacritic: z.number().int().min(0).max(100).optional().nullable(),
  normalizedPlatforms: z.array(platformFamilyEnum).default([]),
});

export const discoveryUndoSchema = z.object({
  decisionId: z.string().uuid(),
});

export const recoverDismissedSchema = z.object({
  rawgId: z.number().int().positive(),
  interestStatus: z.enum(['THINKING', 'INTERESTED', 'MUST_BUY']),
});

export type RawgSearchQuery = z.infer<typeof rawgSearchQuerySchema>;
export type RawgDiscoverQuery = z.infer<typeof rawgDiscoverQuerySchema>;
export type DiscoveryDecideInput = z.infer<typeof discoveryDecideSchema>;
export type DiscoveryUndoInput = z.infer<typeof discoveryUndoSchema>;
export type RecoverDismissedInput = z.infer<typeof recoverDismissedSchema>;
