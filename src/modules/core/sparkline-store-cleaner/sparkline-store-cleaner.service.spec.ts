import { ConfigService } from '@nestjs/config';
import { getConnectionToken, getModelToken } from '@nestjs/mongoose';
import { Test, TestingModule } from '@nestjs/testing';

import { ActualSparkline } from '../../../models/actual-sparkline.model';
import { Sparkline } from '../../../models/sparkline.model';
import { REDIS_PROVIDER_MAIN_8 } from '../../resources/redis/redis-provider.constants';
import { CustomErrorHandler } from '../../shared/custom-error-handler/custom-error-handler.service';
import { CUSTOM_LOGGER } from '../../shared/custom-logger/custom-logger.constants';
import { MethodFreezeAlert } from '../../shared/method-freeze-alert/method-freeze-alert.service';

import { SparklineStoreCleaner } from './sparkline-store-cleaner.service';

jest.mock('simple-redis-mutex', () => ({
  ...jest.requireActual('simple-redis-mutex'),
  lock: jest.fn().mockResolvedValue(jest.fn()),
}));
jest.mock('axios');
jest.mock('ioredis');

describe('SparklineStoreCleaner', () => {
  let service: SparklineStoreCleaner;

  const errorHandlerMock = { logAndNotifyInTg: jest.fn() };
  const loggerMock = { log: jest.fn() };
  const methodFreezeAlertMock = {
    startMonitoring: jest.fn(),
    stopMonitoring: jest.fn(),
  };
  const mongoSessionMock = jest.fn(() => ({
    startTransaction: jest.fn(),
    commitTransaction: jest.fn(),
    abortTransaction: jest.fn(),
    endSession: jest.fn(),
  }));
  const mongoConnectionMock = { startSession: mongoSessionMock };
  const sparklineModelMock = { deleteOne: jest.fn(), find: jest.fn() };
  const actualSparklineModelMock = { deleteOne: jest.fn() };
  const redisInstanceMock = { get: jest.fn(), set: jest.fn() };
  const redisProviderMock = { getInstance: jest.fn().mockReturnValue(redisInstanceMock) };
  const configServiceMock = {
    get: jest.fn().mockReturnValue({ 
      staticAssetsServerUrl: 'staticAssetsServerUrl',
    })
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SparklineStoreCleaner,
        { provide: CustomErrorHandler, useValue: errorHandlerMock },
        { provide: CUSTOM_LOGGER, useValue: loggerMock },
        { provide: MethodFreezeAlert, useValue: methodFreezeAlertMock },
        { provide: getConnectionToken(), useValue: mongoConnectionMock },
        { provide: getModelToken(Sparkline.name), useValue: sparklineModelMock },
        { provide: getModelToken(ActualSparkline.name), useValue: actualSparklineModelMock },
        { provide: REDIS_PROVIDER_MAIN_8, useValue: redisProviderMock },
        { provide: ConfigService, useValue: configServiceMock }
      ]
    }).compile();

    service = module.get<SparklineStoreCleaner>(SparklineStoreCleaner)
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  })

  it('should execute deleteFromDb for each sparkline', async () => {
    const sparklineMock1 = {
      tokenAddress: '0x1',
      fileName: 'fileName',
      date: (new Date).toISOString(),
      priceChangePeriod: '1d',
      priceChange: '+15%',
      timeframe: 15,
    };
    const sparklineMock2 = {
      tokenAddress: '0x2',
      fileName: 'fileName',
      date: (new Date).toISOString(),
      priceChangePeriod: '1d',
      priceChange: '+15%',
      timeframe: 15,
    };

    sparklineModelMock.find.mockResolvedValue([sparklineMock1, sparklineMock2]);
    actualSparklineModelMock.deleteOne.mockResolvedValue({ deletedCount: 1 });
    redisInstanceMock.get.mockResolvedValue(JSON.stringify({ sparkline: sparklineMock1 }));

    await service.cleanSparklineStore();

    expect(errorHandlerMock.logAndNotifyInTg).not.toHaveBeenCalled();
    expect(sparklineModelMock.deleteOne).toHaveBeenCalledTimes(2);
    expect(sparklineModelMock.deleteOne).toHaveBeenNthCalledWith(1, { tokenAddress: sparklineMock1.tokenAddress });
    expect(sparklineModelMock.deleteOne).toHaveBeenNthCalledWith(2, { tokenAddress: sparklineMock2.tokenAddress });

    expect(redisInstanceMock.get).toHaveBeenCalledTimes(2);
    expect(redisInstanceMock.get).toHaveBeenNthCalledWith(1, sparklineMock1.tokenAddress);
    expect(redisInstanceMock.get).toHaveBeenNthCalledWith(2, sparklineMock2.tokenAddress);
  });

  it('should log an error if there is a problem with a DB', async () => {
    const sparklineMock = {
      tokenAddress: '0x1',
      fileName: 'fileName',
      date: (new Date).toISOString(),
      priceChangePeriod: '1d',
      priceChange: '+15%',
      timeframe: 15,
    };

    sparklineModelMock.find.mockResolvedValue([sparklineMock]);
    actualSparklineModelMock.deleteOne.mockResolvedValue({ deletedCount: 1 });
    redisInstanceMock.get.mockResolvedValue(null);

    await service.cleanSparklineStore();

    expect(errorHandlerMock.logAndNotifyInTg).toHaveBeenCalled();
  });
})