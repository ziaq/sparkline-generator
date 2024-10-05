import { z } from 'zod';

import { tokenAddressZod } from './token-address.model';
import { TrendingNameInDbZod } from './trending-list-names.model';

export const updateSingleSparklineDtoZod = z.object({
  tokenAddress: tokenAddressZod,
  listName: TrendingNameInDbZod,
  isNeedUpdTrending: z.boolean(),
});

export type UpdateSingleSparklineDto = z.infer<
  typeof updateSingleSparklineDtoZod
>;
