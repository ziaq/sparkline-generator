import { Inject, Injectable } from '@nestjs/common';
import { Redis } from 'ioredis';
import { lock, ReleaseFunction } from 'simple-redis-mutex';

import { TokenAddress } from '../../../models/token-address.model';
import { TrendingNameInDb } from '../../../models/trending-list-names.model';
import { REDIS_PROVIDER_MAIN_8 } from '../../resources/redis/redis-provider.constants';
import { RedisProvider } from '../../resources/redis/redis-provider.service';
import { CustomErrorHandler } from '../../shared/custom-error-handler/custom-error-handler.service';
import { CUSTOM_LOGGER } from '../../shared/custom-logger/custom-logger.constants';
import { CustomLogger } from '../../shared/custom-logger/custom-logger.service';
import { MethodFreezeAlert } from '../../shared/method-freeze-alert/method-freeze-alert.service';

import { ChartDataFetcher } from './sparkline-building/chart-data-fetcher/chart-data-fetcher.service';
import { SvgGenerator } from './sparkline-building/svg-generator.service';
import { TimeDataForChartService } from './sparkline-building/time-data-for-chart.service';
import { SparklineSaver } from './sparkline-saving/sparkline-saver.service';

@Injectable()
export class SparklineUpdater {
  private temporarilyIgnored: TokenAddress[] = [];
  private readonly redisMain8: Redis;

  constructor(
    @Inject(CUSTOM_LOGGER) private readonly logger: CustomLogger,
    private readonly errorHandler: CustomErrorHandler,
    private readonly methodFreezeAlert: MethodFreezeAlert,
    @Inject(REDIS_PROVIDER_MAIN_8) redisProviderMain8: RedisProvider,
    private readonly chartTimeDataGenerator: TimeDataForChartService,
    private readonly chartInfoFetcherManager: ChartDataFetcher,
    private readonly svgSparklineGenerator: SvgGenerator,
    private readonly sparklineSaver: SparklineSaver,
  ) {
    this.redisMain8 = redisProviderMain8.getInstance();
  }

  async buildAndStore(
    tokenAddress: TokenAddress,
    listName: TrendingNameInDb | 'allTrendingLists',
  ) {
    if (this.temporarilyIgnored.includes(tokenAddress)) return;
    let release: ReleaseFunction;

    const timerId = this.methodFreezeAlert.startMonitoring(
      this.constructor.name,
      this.buildAndStore.name,
      `tokenAddress ${tokenAddress}, listName ${listName}`,
    );

    try {
      release = await lock(this.redisMain8, tokenAddress, {
        timeoutMillis: 150000,
      });
      const noteworthTokenString = await this.redisMain8.get(tokenAddress);
      if (!noteworthTokenString)
        throw new Error(`noteworthTokenString in null, token ${tokenAddress}`);
      const noteworthToken = JSON.parse(noteworthTokenString);

      if (!noteworthToken.liqPair) return;

      const chartTimeData = this.chartTimeDataGenerator.genTimeData(
        noteworthToken.additionDate,
      );
      const chartData = await this.chartInfoFetcherManager.fetchChartData(
        tokenAddress,
        noteworthToken.liqPair,
        chartTimeData,
      );

      if (!chartData) {
        this.logger.error(
          `Can't get chartData, add to temporarilyIgnored token ${tokenAddress}. Miss sparkline generation`,
          this.constructor.name,
        );
        this.temporarilyIgnored.push(tokenAddress);

        setTimeout(() => {
          // Stop ignoring after 15 min
          this.temporarilyIgnored = this.temporarilyIgnored.filter(
            (el) => el !== tokenAddress,
          );
          this.logger.log(
            `[${this.constructor.name}] [${this.buildAndStore.name}] Deleted from temporarilyIgnored token ${tokenAddress}`,
          );
        }, 870000); // 14 min 30 sec

        return;
      }

      const svg = this.svgSparklineGenerator.generate({
        values: chartData.chartOnlyClosePrices,
        width: 200,
        height: 40,
        stroke: 'currentColor',
        strokeWidth: 1.25,
        strokeOpacity: 1,
      });

      const priceChange: string | null =
        chartTimeData.hoursSinceLaunch <= 24 ? null : chartData.priceChange;

      await this.sparklineSaver.saveSparkline(
        tokenAddress,
        noteworthToken,
        chartTimeData,
        priceChange,
        svg,
      );
    } catch (error) {
      this.errorHandler.logAndNotifyInTg(
        error.toString(),
        this.constructor.name,
        this.buildAndStore.name,
        `token ${tokenAddress} listName ${listName}`,
      );
    } finally {
      if (release) release();
      this.methodFreezeAlert.stopMonitoring(timerId);
    }
  }
}
