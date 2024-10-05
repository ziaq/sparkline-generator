import { z } from 'zod';

const VisibilityPropNameSchema = z.enum([
  'topTokens',
  'topTokensFresh',
  'safeguard',
  'safeguardFresh',
  'buyTech',
  'buyTechFresh',
  'dexscreener',
  'dexscreenerFresh',
  'dextools',
  'dextoolsFresh',
  'dextoolsSocialsUpdFresh',
  'moontok',
  'moontokFresh',
  'cmcDex',
  'cmcDexFresh',
  'cmcListedFresh',
  'cmcListedWithinTwoDays',
  'updProfileFresh',
]);

const ISODateStringSchema = z.string().datetime();

export const NoteworthTokenZod = z.object({
  shortName: z.string(),
  longName: z.string(),
  truncatedSymbol: z.string(),
  liqPair: z.string().optional(),
  tg: z.string(),
  additionDate: ISODateStringSchema,
  isNeedSendMsgIfFirstTimeGreen: z.boolean(),
  isAddDateSyncWithDb11: z.boolean(),
  visibility: z.record(VisibilityPropNameSchema, z.boolean()),
  priceChange24h: z.string().optional(),
  sparkline: z
    .object({
      fileName: z.string(),
      date: ISODateStringSchema,
      priceChangePeriod: z.union([z.string(), z.null()]),
      priceChange: z.union([z.string(), z.null()]),
      timeframe: z.union([z.literal(5), z.literal(15)]),
    })
    .optional(),
});
export type NoteworthToken = z.infer<typeof NoteworthTokenZod>;
