import { z } from 'zod';

const envSchema = z.object({
  PORT: z.coerce.number().default(9231),
  HOST: z.string().default('0.0.0.0'),
  OLLAMA_URL: z.string().url().optional(),
  OLLAMA_TOKEN: z.string().min(1).optional()
});

export const env = envSchema.parse(process.env);
