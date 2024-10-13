import { Inject, Injectable } from '@nestjs/common';
import { Redis } from 'ioredis';
import { lock, ReleaseFunction } from 'simple-redis-mutex';
import { Test, TestingModule } from '@nestjs/testing';

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

import { SparklineUpdater } from './sparkline-updater.service';

jest.mock('ioredis');
jest.mock('simple-redis-mutex', () => ({
  lock: jest.fn()
}));

describe('SparklineUpdater', () => {
  let service: SparklineUpdater;

  const loggerMock = { log: jest.fn(), error: jest.fn() };
  const errorHandlerMock = { logAndNotifyInTg: jest.fn() };
  const methodFreezeAlertMock = { startMonitoring: jest.fn(), stopMonitoring: jest.fn() };
  const redisInstanceMock = { get: jest.fn(), set: jest.fn() };
  const redisProviderMock = { getInstance: jest.fn().mockReturnValue(redisInstanceMock) };
  const chartTimeDataGeneratorMock = { genTimeData: jest.fn() };
  const chartInfoFetcherManagerMock = { fetchChartData: jest.fn() };
  const svgSparklineGeneratorMock = { generate: jest.fn() };
  const sparklineSaverMock = { saveSparkline: jest.fn() };

  beforeEach(async () => {  
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SparklineUpdater,
        { provide: CUSTOM_LOGGER, useValue: loggerMock },
        { provide: CustomErrorHandler, useValue: errorHandlerMock },
        { provide: MethodFreezeAlert, useValue: methodFreezeAlertMock },
        { provide: REDIS_PROVIDER_MAIN_8, useValue: redisProviderMock },
        { provide: TimeDataForChartService, useValue: chartTimeDataGeneratorMock },
        { provide: ChartDataFetcher, useValue: chartInfoFetcherManagerMock },
        { provide: SvgGenerator, useValue: svgSparklineGeneratorMock },
        { provide: SparklineSaver, useValue: sparklineSaverMock }
      ],
    }).compile();
  
    service = module.get<SparklineUpdater>(SparklineUpdater);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should generate sparkline', async () => {
    chartTimeDataGeneratorMock.genTimeData.mockReturnValue({ hoursSinceLaunch: 10 });
    redisInstanceMock.get.mockResolvedValue(JSON.stringify({ liqPair: '0x' }));
    chartInfoFetcherManagerMock.fetchChartData.mockResolvedValue({ 
      chartOnlyClosePrices: 'someData',  
      priceChange: '99',
    });

    await service.buildAndStore('0x', 'buyTechTrending');

    expect(errorHandlerMock.logAndNotifyInTg).not.toHaveBeenCalled();
    expect(sparklineSaverMock.saveSparkline).toHaveBeenCalled();
  });

  it('should log an error if there is a problem with a DB', async () => {
    redisInstanceMock.get.mockResolvedValue(null);
    
    await service.buildAndStore('0x', 'buyTechTrending');
    expect(errorHandlerMock.logAndNotifyInTg).toHaveBeenCalled();
  })
});
