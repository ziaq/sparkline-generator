import { Inject, Injectable, OnModuleInit } from '@nestjs/common';
import { SchedulerRegistry } from '@nestjs/schedule';
import { CronJob } from 'cron';

import { TokenAddress } from './models/token-address.model';
import { TrendingNameInDb } from './models/trending-list-names.model';
import { SparklineStoreCleaner } from './modules/core/sparkline-store-cleaner/sparkline-store-cleaner.service';
import { SparklineUpdater } from './modules/core/sparkline-updater/sparkline-updater.service';
import { TrendingListRefresher } from './modules/core/trending-list-refresher/trending-list-refresher.service';
import { TrendingTokenAggregator } from './modules/core/trending-token-aggregator/trending-token-aggregator.service';
import { CustomErrorHandler } from './modules/shared/custom-error-handler/custom-error-handler.service';
import { CUSTOM_LOGGER } from './modules/shared/custom-logger/custom-logger.constants';
import { CustomLogger } from './modules/shared/custom-logger/custom-logger.service';
import { MethodFreezeAlert } from './modules/shared/method-freeze-alert/method-freeze-alert.service';
const pLimit = require('p-limit');

@Injectable()
export class AppService implements OnModuleInit {
  constructor(
    @Inject(CUSTOM_LOGGER) private readonly logger: CustomLogger,
    private readonly errorHandler: CustomErrorHandler,
    private readonly methodFreezeAlert: MethodFreezeAlert,
    private readonly sparklineUpdater: SparklineUpdater,
    private readonly trendingListRefresh: TrendingListRefresher,
    private readonly trendingTokenAggregator: TrendingTokenAggregator,
    private readonly schedulerRegistry: SchedulerRegistry,
    private readonly sparklineStoreCleaner: SparklineStoreCleaner,
  ) {}

  onModuleInit() {
    // Every 5 min
    const updateSparklinesJob = new CronJob('*/5 * * * *', () => {
      this.updateSparklinesForTrendingTokensCron();
    });
    this.schedulerRegistry.addCronJob(
      'updateSparklinesJob',
      updateSparklinesJob,
    );
    updateSparklinesJob.start();

    // Every hour
    const cleanSparklinesStoreJob = new CronJob('0 * * * *', () => {
      this.sparklineStoreCleaner.cleanSparklineStore();
    });
    this.schedulerRegistry.addCronJob(
      'cleanSparklinesStoreJob',
      cleanSparklinesStoreJob,
    );
    cleanSparklinesStoreJob.start();
  }

  private async updateSparklinesForTrendingTokensCron() {
    try {
      const tokenList =
        await this.trendingTokenAggregator.getUniqueTrendingTokens();
      if (tokenList) {
        await this.updateMultipleSparklines(tokenList, 'allTrendingLists');
      } else {
        throw new Error(
          `[${this.updateSparklinesForTrendingTokensCron.name}] Сan't execute due to empty tokenList`,
        );
      }
    } catch (error) {
      this.errorHandler.logAndNotifyInTg(
        error.toString(),
        this.constructor.name,
        this.updateSparklinesForTrendingTokensCron.name,
      );
    }
  }

  public async updateSingleSparkline(
    tokenAddress: TokenAddress,
    listName: TrendingNameInDb,
    isNeedUpdTrending: boolean,
  ) {
    const timerId = this.methodFreezeAlert.startMonitoring(
      this.constructor.name,
      this.updateSingleSparkline.name,
      `tokenAddress ${tokenAddress} listName ${listName} isNeedUpdTrending ${isNeedUpdTrending}`,
    );

    try {
      await this.sparklineUpdater.buildAndStore(tokenAddress, listName);

      // Triggers the generation of trending in the info-provider-for-site-tg
      if (isNeedUpdTrending) {
        await this.trendingListRefresh.refreshSingle(listName);
        this.logger.log(
          `Updated token ${tokenAddress} sparkline in ${listName} WITH trending refresh`,
          this.constructor.name,
        );
      } else {
        this.logger.log(
          `Updated token ${tokenAddress} sparkline in ${listName} WITHOUT trending refresh`,
          this.constructor.name,
        );
      }
    } catch (error) {
      this.errorHandler.logAndNotifyInTg(
        error.toString(),
        this.constructor.name,
        this.updateSingleSparkline.name,
        `tokenAddress ${tokenAddress}, listName ${listName}, isNeedUpdTrending ${isNeedUpdTrending}`,
      );
    } finally {
      this.methodFreezeAlert.stopMonitoring(timerId);
    }
  }

  public async updateMultipleSparklines(
    tokenList: TokenAddress[],
    listName: TrendingNameInDb | 'allTrendingLists',
  ) {
    const timerId = this.methodFreezeAlert.startMonitoring(
      this.constructor.name,
      this.updateSingleSparkline.name,
      `listName ${listName}`,
    );

    const limit = pLimit(10); // Maximum of 10 token processing at the same time

    try {
      const updateSparklineTasks = tokenList.map((tokenAddress) => {
        return limit(() =>
          this.sparklineUpdater.buildAndStore(tokenAddress, listName),
        );
      });

      await Promise.all(updateSparklineTasks);

      // Triggers the generation of trending in the info-provider-for-site-tg
      if (listName === 'allTrendingLists') {
        await this.trendingListRefresh.refreshAll();
      } else {
        await this.trendingListRefresh.refreshSingle(listName);
      }

      this.logger.log(
        `Updated ${tokenList.length} sparklines in ${listName}`,
        this.constructor.name,
      );
    } catch (error) {
      this.errorHandler.logAndNotifyInTg(
        error.toString(),
        this.constructor.name,
        this.updateSingleSparkline.name,
        `listName ${listName}`,
      );
    } finally {
      this.methodFreezeAlert.stopMonitoring(timerId);
    }
  }
}
