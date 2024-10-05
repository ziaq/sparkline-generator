import { Inject, Injectable } from '@nestjs/common';
import Redis from 'ioredis';

import { TrendingNameInDb } from '../../../models/trending-list-names.model';
import { REDIS_PROVIDER_MAIN_8 } from '../../resources/redis/redis-provider.constants';
import { RedisProvider } from '../../resources/redis/redis-provider.service';
import { TrendingListNames } from '../../resources/trending-list-names/trending-list-names.service';
import { CustomErrorHandler } from '../../shared/custom-error-handler/custom-error-handler.service';

@Injectable()
export class TrendingTokenAggregator {
  private readonly redisMain8: Redis;
  private readonly trendinglistNamesEnchanced: TrendingNameInDb[];

  constructor(
    private readonly errorHandler: CustomErrorHandler,
    trendingListNames: TrendingListNames,
    @Inject(REDIS_PROVIDER_MAIN_8) redisProviderMain8: RedisProvider,
  ) {
    this.redisMain8 = redisProviderMain8.getInstance();
    this.trendinglistNamesEnchanced = trendingListNames.getEnhancedNames();
  }

  private async getTrendingTokens() {
    const trendingTokens = [];

    for (const listName of this.trendinglistNamesEnchanced) {
      const trendingString = await this.redisMain8.get(listName);

      if (trendingString) {
        const trending = JSON.parse(trendingString);
        trendingTokens.push(...trending);
      } else {
        throw new Error(
          `[${this.getTrendingTokens.name}] can't get listName ${listName}`,
        );
      }
    }

    return trendingTokens;
  }

  public async getUniqueTrendingTokens() {
    try {
      const trendingTokens = await this.getTrendingTokens();
      const uniqueTrendingTokens = [...new Set(trendingTokens)];

      return uniqueTrendingTokens; // From all trending lists
    } catch (error) {
      this.errorHandler.logAndNotifyInTg(
        error.toString(),
        this.constructor.name,
        this.getUniqueTrendingTokens.name,
      );

      return null;
    }
  }
}
