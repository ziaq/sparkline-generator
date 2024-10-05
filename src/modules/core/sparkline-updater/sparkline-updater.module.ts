import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';

import { ActualSparkline, actualSparklineSchema } from '../../../models/actual-sparkline.model';
import { Sparkline, sparklineSchema } from '../../../models/sparkline.model';
import { BrowserProviderModule } from '../../resources/browser-provider/browser-provider.module';
import { ProxiesRepositoryModule } from '../../resources/proxies-repository/proxies-repository.module';
import { MethodFreezeAlertModule } from '../../shared/method-freeze-alert/method-freeze-alert.module';

import { ChartDataFetcher } from './sparkline-building/chart-data-fetcher/chart-data-fetcher.service';
import { CmcScraper } from './sparkline-building/chart-data-fetcher/services/cmc-scraper.service';
import { GeckoApiFetcher } from './sparkline-building/chart-data-fetcher/services/gecko-api-fetcher.service';
import { SvgGenerator } from './sparkline-building/svg-generator.service';
import { TimeDataForChartService } from './sparkline-building/time-data-for-chart.service';
import { SparklineSaver } from './sparkline-saving/sparkline-saver.service';
import { SparklineUpdater } from './sparkline-updater.service';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Sparkline.name, schema: sparklineSchema },
      { name: ActualSparkline.name, schema: actualSparklineSchema },
    ]),
    MethodFreezeAlertModule,
    ProxiesRepositoryModule,
    BrowserProviderModule,
  ],
  providers: [
    SparklineUpdater,
    SparklineSaver,
    TimeDataForChartService,
    ChartDataFetcher,
    GeckoApiFetcher,
    CmcScraper,
    SvgGenerator,
  ],
  exports: [SparklineUpdater],
})
export class SparklineUpdaterModule {}
