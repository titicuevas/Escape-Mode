import { z } from 'zod';

export const interestStatusEnum = z.enum([
  'INTERESTED',
  'THINKING',
  'NOT_INTERESTED',
  'MUST_BUY',
]);

export const purchaseStatusEnum = z.enum([
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

export const dateSourceEnum = z.enum(['RAWG', 'MANUAL', 'OFFICIAL', 'UNKNOWN']);

export const mediaFormatEnum = z.enum(['PHYSICAL', 'DIGITAL', 'UNKNOWN']);

export const platformFamilyEnum = z.enum([
  'PLAYSTATION_5',
  'XBOX_SERIES',
  'NINTENDO_SWITCH',
  'NINTENDO_SWITCH_2',
  'PC',
  'OTHER',
]);

export type PlatformFamily = z.infer<typeof platformFamilyEnum>;
export type MediaFormat = z.infer<typeof mediaFormatEnum>;

/** '' → undefined; permite null explícito para limpiar campos */
const emptyToUndefined = (v: unknown) => (v === '' ? undefined : v);

const optionalUrl = z.preprocess(
  emptyToUndefined,
  z.union([z.string().url('URL no válida'), z.null()]).optional(),
);

const optionalDate = z.preprocess(
  emptyToUndefined,
  z
    .union([
      z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Usa el formato AAAA-MM-DD'),
      z.null(),
    ])
    .optional(),
);

const optionalMoney = z.preprocess((v) => {
  if (v === undefined || v === '') return undefined;
  if (v === null) return null;
  if (typeof v === 'number') return v;
  if (typeof v === 'string') {
    const n = Number(v.replace(',', '.'));
    return Number.isNaN(n) ? v : n;
  }
  return v;
}, z.union([z.number().nonnegative('El importe no puede ser negativo'), z.null()]).optional());

export const gameCreateSchema = z.object({
  title: z.string().trim().min(1, 'El título es obligatorio').max(200),
  rawgId: z.number().int().positive().optional().nullable(),
  slug: z.string().max(200).optional().nullable(),
  coverUrl: optionalUrl,
  backgroundUrl: optionalUrl,
  description: z.string().max(10000).optional().nullable(),
  releaseDate: optionalDate,
  earlyAccessDate: optionalDate,
  dateSource: dateSourceEnum.default('MANUAL'),
  officialUrl: optionalUrl,
  rawgUrl: optionalUrl,
  platforms: z.array(z.string()).default([]),
  normalizedPlatforms: z.array(platformFamilyEnum).default([]),
  genres: z.array(z.string()).default([]),
  developer: z.string().max(200).optional().nullable(),
  publisher: z.string().max(200).optional().nullable(),
  esrbRating: z.string().max(50).optional().nullable(),
  metacritic: z.number().int().min(0).max(100).optional().nullable(),
  interestStatus: interestStatusEnum.default('THINKING'),
  purchaseStatus: purchaseStatusEnum.default('UNRESERVED'),
  selectedPlatform: z.string().max(100).optional().nullable(),
  selectedEdition: z.string().max(100).optional().nullable(),
  selectedStore: z.string().max(100).optional().nullable(),
  mediaFormat: mediaFormatEnum.default('UNKNOWN'),
  totalPrice: optionalMoney,
  targetPrice: optionalMoney,
  amountPaid: optionalMoney,
  reservationDate: optionalDate,
  paymentDeadline: optionalDate,
  orderNumber: z.string().max(100).optional().nullable(),
  purchaseUrl: optionalUrl,
  includesBonus: z.boolean().default(false),
  bonusDescription: z.string().max(500).optional().nullable(),
  useEarlyAccessAsMainDate: z.boolean().default(false),
  notes: z.string().max(5000).optional().nullable(),
});

export const gameUpdateSchema = gameCreateSchema.partial().refine(
  (data) => Object.keys(data).length > 0,
  'Debes enviar al menos un campo',
);

export const gamesQuerySchema = z.object({
  q: z.string().optional(),
  platform: z.string().optional(),
  year: z.coerce.number().int().optional(),
  month: z.coerce.number().int().min(1).max(12).optional(),
  interestStatus: interestStatusEnum.optional(),
  purchaseStatus: purchaseStatusEnum.optional(),
  reserved: z
    .enum(['true', 'false'])
    .optional()
    .transform((v) => (v === undefined ? undefined : v === 'true')),
  paid: z
    .enum(['true', 'false'])
    .optional()
    .transform((v) => (v === undefined ? undefined : v === 'true')),
  dateFrom: optionalDate,
  dateTo: optionalDate,
  unknownPrice: z
    .enum(['true', 'false'])
    .optional()
    .transform((v) => (v === undefined ? undefined : v === 'true')),
  pendingPayment: z
    .enum(['true', 'false'])
    .optional()
    .transform((v) => (v === undefined ? undefined : v === 'true')),
  knownDate: z
    .enum(['true', 'false'])
    .optional()
    .transform((v) => (v === undefined ? undefined : v === 'true')),
  sort: z.enum(['date', 'title', 'updated']).default('date'),
  order: z.enum(['asc', 'desc']).default('asc'),
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(200).default(24),
});

export type GameCreateInput = z.infer<typeof gameCreateSchema>;
export type GameUpdateInput = z.infer<typeof gameUpdateSchema>;
export type GamesQueryInput = z.infer<typeof gamesQuerySchema>;
