import { Module } from '@nestjs/common';

import { TrendingListNamesModule } from '../../resources/trending-list-names/trending-list-names.module';

import { TrendingListRefresher } from './trending-list-refresher.service';

@Module({
  imports: [TrendingListNamesModule],
  providers: [TrendingListRefresher],
  exports: [TrendingListRefresher],
})
export class TrendingListRefresherModule {}
