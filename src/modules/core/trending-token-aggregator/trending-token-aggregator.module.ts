import { Module } from '@nestjs/common';

import { TrendingListNamesModule } from '../../resources/trending-list-names/trending-list-names.module';

import { TrendingTokenAggregator } from './trending-token-aggregator.service';

@Module({
  imports: [TrendingListNamesModule],
  providers: [TrendingTokenAggregator],
  exports: [TrendingTokenAggregator],
})
export class TrendingTokenAggregatorModule {}
