import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';

import {
  HighQualityProxy,
  highQualityProxySchema,
} from './models/high-quality-proxy.model';
import {
  HighQualityProxyFallback,
  highQualityProxyFallbackSchema,
} from './models/high-quality-proxy-fallback.model';
import {
  StandardProxy,
  standardProxySchema,
} from './models/standard-proxy.model';
import { PROXIES_REPOSITORY } from './proxies-repository.constants';
import { proxiesRepositoryProvider } from './proxies-repository.providers';

@Module({
  imports: [
    MongooseModule.forFeature([
      {
        name: StandardProxy.name,
        schema: standardProxySchema,
      },
      {
        name: HighQualityProxy.name,
        schema: highQualityProxySchema,
      },
      {
        name: HighQualityProxyFallback.name,
        schema: highQualityProxyFallbackSchema,
      },
    ]),
  ],
  providers: [proxiesRepositoryProvider],
  exports: [PROXIES_REPOSITORY],
})
export class ProxiesRepositoryModule {}
