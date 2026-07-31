import { z } from 'zod';

export * from './games.js';
export * from './finance.js';
export * from './rawg.js';
export * from './preferences.js';
export * from './lists.js';

export const loginSchema = z.object({
  email: z.string().email('Correo no válido').min(1, 'El correo es obligatorio'),
  password: z.string().min(1, 'La contraseña es obligatoria'),
});

export type LoginInput = z.infer<typeof loginSchema>;

export const interestStatusLabels = {
  INTERESTED: 'Me interesa',
  THINKING: 'Me lo pienso',
  NOT_INTERESTED: 'Descartado',
  MUST_BUY: 'Compra segura',
} as const;

export const purchaseStatusLabels = {
  UNRESERVED: 'Sin reservar',
  WAITING_OFFER: 'Esperando oferta',
  RESERVED: 'Reservado',
  PARTIALLY_PAID: 'Parcialmente pagado',
  PAID: 'Pagado',
  CANCELLED: 'Cancelado',
  RECEIVED: 'Recibido',
  PLAYING: 'Jugando',
  COMPLETED: 'Terminado',
} as const;

export const availabilityLabels = {
  AVAILABLE: 'Disponible',
  PREORDER: 'Preventa',
  OUT_OF_STOCK: 'Agotado',
  UNKNOWN: 'Desconocido',
} as const;

export const paymentTypeLabels = {
  RESERVATION: 'Reserva',
  PAYMENT: 'Pago',
  REFUND: 'Reembolso',
} as const;

export const discoveryDecisionLabels = {
  LIKED: 'Me interesa',
  THINKING: 'Me lo pienso',
  DISMISSED: 'Descartado',
  MUST_BUY: 'Compra segura',
} as const;

export const mediaFormatLabels = {
  PHYSICAL: 'Físico',
  DIGITAL: 'Digital',
  UNKNOWN: 'Sin especificar',
} as const;

export const dateSourceLabels = {
  OFFICIAL: 'Oficial',
  RAWG: 'RAWG',
  MANUAL: 'Manual',
  UNKNOWN: 'Desconocida',
} as const;

export const platformFamilyLabels = {
  PLAYSTATION_5: 'PlayStation 5',
  XBOX_SERIES: 'Xbox Series',
  NINTENDO_SWITCH: 'Nintendo Switch',
  NINTENDO_SWITCH_2: 'Nintendo Switch 2',
  PC: 'PC',
  OTHER: 'Otra',
} as const;
