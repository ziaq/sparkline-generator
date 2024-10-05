import { getModelToken } from '@nestjs/mongoose';
import { Model } from 'mongoose';

import { HighQualityProxy } from './models/high-quality-proxy.model';
import { HighQualityProxyFallback } from './models/high-quality-proxy-fallback.model';
import { StandardProxy } from './models/standard-proxy.model';
import { PROXIES_REPOSITORY } from './proxies-repository.constants';
import { ProxiesRepository } from './proxies-repository.service';

export const proxiesRepositoryProvider = {
  provide: PROXIES_REPOSITORY,
  useFactory: async (
    standardProxyModel: Model<StandardProxy>,
    highQualityProxyModel: Model<HighQualityProxy>,
    highQualityProxyFallbackModel: Model<HighQualityProxyFallback>,
  ) => {
    const proxiesRepository = new ProxiesRepository(
      standardProxyModel,
      highQualityProxyModel,
      highQualityProxyFallbackModel,
    );
    await proxiesRepository.init();
    return proxiesRepository;
  },
  inject: [
    getModelToken(StandardProxy.name),
    getModelToken(HighQualityProxy.name),
    getModelToken(HighQualityProxyFallback.name),
  ],
};
