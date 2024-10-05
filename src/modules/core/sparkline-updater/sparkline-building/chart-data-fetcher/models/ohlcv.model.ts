import { z } from 'zod';

export const ohlcvCmcZod = z.object({
  time: z.number(),
  open: z.number(),
  close: z.number(),
});
export type OhlcvCmc = z.infer<typeof ohlcvCmcZod>;
export type OhlcvArrayCmc = OhlcvCmc[];

export const ohlcvGeckoZod = z.record(z.string(), z.number());
export type OhlcvGecko = z.infer<typeof ohlcvGeckoZod>;
export type OhlcvArrayGecko = OhlcvGecko[];
