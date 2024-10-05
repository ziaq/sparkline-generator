import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { ScheduleModule } from '@nestjs/schedule';
import { CustomErrorHandlerModule } from 'src/modules/shared/custom-error-handler/custom-error-handler.module';

import config, { Config } from './config/config';
import { CONFIG } from './config/config.constants';
import { validate } from './config/env.validation';
import { SparklineStoreCleanerModule } from './modules/core/sparkline-store-cleaner/sparkline-store-cleaner.module';
import { SparklineUpdaterModule } from './modules/core/sparkline-updater/sparkline-updater.module';
import { TrendingListRefresherModule } from './modules/core/trending-list-refresher/trending-list-refresher.module';
import { TrendingTokenAggregatorModule } from './modules/core/trending-token-aggregator/trending-token-aggregator.module';
import { BrowserProviderModule } from './modules/resources/browser-provider/browser-provider.module';
import { ProxiesRepositoryModule } from './modules/resources/proxies-repository/proxies-repository.module';
import { REDIS_PROVIDER_MAIN_8 } from './modules/resources/redis/redis-provider.constants';
import { RedisProviderModule } from './modules/resources/redis/redis-provider.module';
import { TrendingListNamesModule } from './modules/resources/trending-list-names/trending-list-names.module';
import { AppFatalErrorHandlerModule } from './modules/shared/app-fatal-error-handler/app-fatal-error-handler.module';
import { CustomLoggerModule } from './modules/shared/custom-logger/custom-logger.module';
import { MethodFreezeAlertModule } from './modules/shared/method-freeze-alert/method-freeze-alert.module';
import { TgMsgSenderModule } from './modules/shared/tg-msg-sender/tg-msg-sender.module';
import { AppController } from './app.controller';
import { AppService } from './app.service';

@Module({
  imports: [
    ConfigModule.forRoot({
      cache: true,
      isGlobal: true,
      validate,
      load: [config],
    }),
    RedisProviderModule.forRoot([
      { redisNodeName: 'main', dbNum: 8, providerToken: REDIS_PROVIDER_MAIN_8 },
    ]),
    MongooseModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        uri: configService.get<Config>(CONFIG).mongoDb,
      }),
      inject: [ConfigService],
    }),
    ScheduleModule.forRoot(),
    CustomLoggerModule,
    TgMsgSenderModule,
    AppFatalErrorHandlerModule,
    CustomErrorHandlerModule,
    MethodFreezeAlertModule,
    TrendingListNamesModule,
    TrendingTokenAggregatorModule,
    TrendingListRefresherModule,
    SparklineStoreCleanerModule,
    ProxiesRepositoryModule,
    BrowserProviderModule,
    SparklineUpdaterModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
