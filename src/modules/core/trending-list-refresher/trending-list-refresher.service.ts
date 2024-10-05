import { Inject, Injectable } from '@nestjs/common';
import Redis from 'ioredis';

import { TrendingNameInDb } from '../../../models/trending-list-names.model';
import { REDIS_PROVIDER_MAIN_8 } from '../../resources/redis/redis-provider.constants';
import { RedisProvider } from '../../resources/redis/redis-provider.service';
import { TrendingListNames } from '../../resources/trending-list-names/trending-list-names.service';
import { CustomErrorHandler } from '../../shared/custom-error-handler/custom-error-handler.service';

@Injectable()
export class TrendingListRefresher {
  private readonly redisMain8: Redis;
  private readonly trendingDbNamesEnhanced: TrendingNameInDb[];

  constructor(
    private readonly errorHandler: CustomErrorHandler,
    trendingListNames: TrendingListNames,
    @Inject(REDIS_PROVIDER_MAIN_8) redisProviderMain8: RedisProvider,
  ) {
    this.redisMain8 = redisProviderMain8.getInstance();
    this.trendingDbNamesEnhanced = trendingListNames.getEnhancedNames();
  }

  public async refreshSingle(trendingNameInDb: TrendingNameInDb) {
    try {
      const trendingString = await this.redisMain8.get(trendingNameInDb);
      if (!trendingString) throw new Error("Can't find trending in db");
      await this.redisMain8.set(trendingNameInDb, trendingString);
    } catch (error) {
      this.errorHandler.logAndNotifyInTg(
        error.toString(),
        this.constructor.name,
        this.refreshSingle.name,
        `trendingNameInDb ${trendingNameInDb}`,
      );
    }
  }

  public async refreshAll() {
    for (const trendingNameInDb of this.trendingDbNamesEnhanced) {
      await this.refreshSingle(trendingNameInDb);
    }
  }
}
