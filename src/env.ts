import { z } from 'zod';

export const envSchema = z.object({
  APP_ENV: z.enum(['development', 'test', 'production']),
  NEXT_PUBLIC_APP_NAME: z.string().min(1).default('LMS Maroc'),
});

export const env = envSchema.parse({
  APP_ENV: process.env.APP_ENV ?? process.env.NODE_ENV,
  NEXT_PUBLIC_APP_NAME: process.env.NEXT_PUBLIC_APP_NAME,
});
