import { z } from 'zod';

export const TrendingNameInDbMainZod = z.enum([
  'safeguardTrending',
  'buyTechTrending',
  'dexscreenerTrending',
  'dextoolsTrending',
  'moontokTrending',
  'cmcDexTrending',
]);
export type TrendingNameInDbMain = z.infer<typeof TrendingNameInDbMainZod>;

const TrendingNameInDbExtraZod = z.enum([
  'lastUpdatedTrending',
  'topTokensTrendingItemized',
]);

export const TrendingNameInDbZod = z.union([
  TrendingNameInDbMainZod,
  TrendingNameInDbExtraZod,
]);
export type TrendingNameInDb = z.infer<typeof TrendingNameInDbZod>;
