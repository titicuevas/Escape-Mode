import { z } from 'zod';

export const gameListCreateSchema = z.object({
  name: z.string().trim().min(1, 'El nombre es obligatorio').max(80),
  description: z.string().trim().max(300).optional().nullable(),
});

export const gameListUpdateSchema = gameListCreateSchema.partial();

export const gameListItemCreateSchema = z.object({
  gameId: z.string().uuid(),
  note: z.string().trim().max(300).optional().nullable(),
});

export type GameListCreateInput = z.infer<typeof gameListCreateSchema>;
export type GameListUpdateInput = z.infer<typeof gameListUpdateSchema>;
export type GameListItemCreateInput = z.infer<typeof gameListItemCreateSchema>;
