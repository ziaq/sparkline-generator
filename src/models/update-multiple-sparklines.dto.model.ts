import { z } from 'zod';

import { tokenAddressZod } from './token-address.model';
import { TrendingNameInDbZod } from './trending-list-names.model';

export const updateMultipleSparklinesDtoZod = z.object({
  tokenList: z.array(tokenAddressZod),
  listName: TrendingNameInDbZod,
});

export type UpdateMultipleSparklinesDto = z.infer<
  typeof updateMultipleSparklinesDtoZod
>;
