import { Module } from '@nestjs/common';

import { TrendingListNames } from './trending-list-names.service';

@Module({
  providers: [TrendingListNames],
  exports: [TrendingListNames],
})
export class TrendingListNamesModule {}
