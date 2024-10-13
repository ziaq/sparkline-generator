import { Test, TestingModule } from '@nestjs/testing';

import { REDIS_PROVIDER_MAIN_8 } from '../../resources/redis/redis-provider.constants';
import { TrendingListNames } from '../../resources/trending-list-names/trending-list-names.service';
import { CustomErrorHandler } from '../../shared/custom-error-handler/custom-error-handler.service';

import { TrendingListRefresher } from './trending-list-refresher.service';

describe('TrendingListRefresher', () => {
  let service: TrendingListRefresher;
  const tokenAddressesMock = ['token1', 'token2'];
  const trendingName = 'buyTechTrending';
  const trendingListNames = [trendingName, 'safeguardTrending'];

  const errorHandlerMock = {
    logAndNotifyInTg: jest.fn()
  };
  const trendingListNamesMock = {
    getEnhancedNames: jest.fn().mockReturnValue(trendingListNames)
  };
  const redisInstanceMock = {
    get: jest.fn().mockResolvedValue(JSON.stringify(tokenAddressesMock)),
    set: jest.fn(),
  };
  const redisProviderMock = {
    getInstance: jest.fn().mockReturnValue(redisInstanceMock)
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TrendingListRefresher,
        { provide: CustomErrorHandler, useValue: errorHandlerMock },
        { provide: TrendingListNames, useValue: trendingListNamesMock },
        { provide: REDIS_PROVIDER_MAIN_8, useValue: redisProviderMock }
      ]
    }).compile();

    service = module.get<TrendingListRefresher>(TrendingListRefresher);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('refreshSingle', () => {
    it('should retrieve and set trending with valid name', async () => {
      await service.refreshSingle(trendingName);
      expect(redisInstanceMock.get).toHaveBeenCalledWith(trendingName);
      expect(redisInstanceMock.set).toHaveBeenCalledWith(trendingName, JSON.stringify(tokenAddressesMock));
    });

    it('should log an error if the trending data is not found', async () => {
      redisInstanceMock.get.mockResolvedValue(null);
      await service.refreshSingle(trendingName);
      expect(errorHandlerMock.logAndNotifyInTg).toHaveBeenCalled();
    })
  });

  describe('refreshAll', () => {
    it('should call refreshSingle for each listName', async () => {
      jest.spyOn(service, 'refreshSingle');
      await service.refreshAll();
      for (const trending of trendingListNames) {
        expect(service.refreshSingle).toHaveBeenCalledWith(trending);
      }
    });
  });
})