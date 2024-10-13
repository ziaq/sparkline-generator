import { Test, TestingModule } from '@nestjs/testing';

import { RedisProvider } from '../../resources/redis/redis-provider.service';
import { TrendingListNames } from '../../resources/trending-list-names/trending-list-names.service';
import { CustomErrorHandler } from '../../shared/custom-error-handler/custom-error-handler.service';
import { REDIS_PROVIDER_MAIN_8 } from '../../resources/redis/redis-provider.constants';

import { TrendingTokenAggregator } from './trending-token-aggregator.service';

describe('TrendingTokenAggregator', () => {
  let service: TrendingTokenAggregator;
  const tokenAddressesMock = ['token1', 'token2'];

  const redisInstanceMock = {
    get: jest.fn().mockResolvedValue(JSON.stringify(tokenAddressesMock)),
  };
  const redisProviderMock = {
    getInstance: jest.fn().mockReturnValue(redisInstanceMock)
  };
  const trendingListNamesMock = {
    getEnhancedNames: jest.fn().mockReturnValue(['trending1', 'trending2'])
  };
  const errorHandlerMock = {
    logAndNotifyInTg: jest.fn()
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TrendingTokenAggregator,
        { provide: RedisProvider, useValue: redisProviderMock },
        { provide: TrendingListNames, useValue: trendingListNamesMock },
        { provide: CustomErrorHandler, useValue: errorHandlerMock },
        { provide: REDIS_PROVIDER_MAIN_8, useValue: redisProviderMock },
      ],
    }).compile();

    service = module.get<TrendingTokenAggregator>(TrendingTokenAggregator);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should return unique tokens and fetch trending list twice', async () => {
    const uniqueTokens = await service.getUniqueTrendingTokens();
    expect(uniqueTokens).toEqual(tokenAddressesMock);
    expect(redisInstanceMock.get).toHaveBeenCalledTimes(2);
  });

  it('should return null and log the error when the trending data is not found', async () => {
    redisInstanceMock.get.mockResolvedValue(null);
    const result = await service.getUniqueTrendingTokens();
    expect(result).toBeNull();
    expect(errorHandlerMock.logAndNotifyInTg).toHaveBeenCalled();
  });
});
