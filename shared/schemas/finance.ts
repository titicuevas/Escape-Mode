import { z } from 'zod';

export const availabilityEnum = z.enum([
  'AVAILABLE',
  'PREORDER',
  'OUT_OF_STOCK',
  'UNKNOWN',
]);

export const paymentTypeEnum = z.enum(['RESERVATION', 'PAYMENT', 'REFUND']);

export const budgetGroupingEnum = z.enum(['RELEASE', 'RESERVATION', 'PAYMENT']);

export const SUGGESTED_STORES = [
  'Amazon',
  'GAME',
  'Fnac',
  'MediaMarkt',
  'PlayStation Store',
  'Xbox Store',
  'Nintendo eShop',
  'Steam',
  'Otra',
] as const;

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

const moneyPositive = z.preprocess((v) => {
  if (v === undefined || v === '') return undefined;
  if (typeof v === 'number') return v;
  if (typeof v === 'string') {
    const n = Number(v.replace(',', '.'));
    return Number.isNaN(n) ? v : n;
  }
  return v;
}, z.number().positive('El importe debe ser mayor que 0'));

const moneyNonNegative = z.preprocess((v) => {
  if (v === undefined || v === '') return undefined;
  if (typeof v === 'number') return v;
  if (typeof v === 'string') {
    const n = Number(v.replace(',', '.'));
    return Number.isNaN(n) ? v : n;
  }
  return v;
}, z.number().nonnegative('El importe no puede ser negativo'));

export const storeOfferCreateSchema = z.object({
  store: z.string().trim().min(1, 'La tienda es obligatoria').max(100),
  edition: z.string().max(100).optional().nullable(),
  platform: z.string().max(100).optional().nullable(),
  price: moneyNonNegative,
  shippingCost: moneyNonNegative.optional().default(0),
  url: optionalUrl,
  availability: availabilityEnum.default('UNKNOWN'),
  includesBonus: z.boolean().default(false),
  bonusDescription: z.string().max(500).optional().nullable(),
  checkedAt: optionalDate,
  notes: z.string().max(2000).optional().nullable(),
});

export const storeOfferUpdateSchema = storeOfferCreateSchema.partial().refine(
  (data) => Object.keys(data).length > 0,
  'Debes enviar al menos un campo',
);

export const paymentCreateSchema = z.object({
  amount: moneyPositive,
  paymentDate: z.preprocess(
    emptyToUndefined,
    z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, 'Usa el formato AAAA-MM-DD')
      .optional(),
  ),
  paymentType: paymentTypeEnum,
  notes: z.string().max(2000).optional().nullable(),
});

export const paymentUpdateSchema = z
  .object({
    amount: moneyPositive.optional(),
    paymentDate: z.preprocess(
      emptyToUndefined,
      z
        .string()
        .regex(/^\d{4}-\d{2}-\d{2}$/, 'Usa el formato AAAA-MM-DD')
        .optional(),
    ),
    paymentType: paymentTypeEnum.optional(),
    notes: z.string().max(2000).optional().nullable(),
  })
  .refine((data) => Object.keys(data).length > 0, 'Debes enviar al menos un campo');

export const budgetQuerySchema = z.object({
  year: z.coerce.number().int().min(2000).max(2100),
  month: z.coerce.number().int().min(1).max(12).optional(),
  grouping: budgetGroupingEnum.default('RELEASE'),
});

export type StoreOfferCreateInput = z.infer<typeof storeOfferCreateSchema>;
export type StoreOfferUpdateInput = z.infer<typeof storeOfferUpdateSchema>;
export type PaymentCreateInput = z.infer<typeof paymentCreateSchema>;
export type PaymentUpdateInput = z.infer<typeof paymentUpdateSchema>;
export type BudgetQueryInput = z.infer<typeof budgetQuerySchema>;
