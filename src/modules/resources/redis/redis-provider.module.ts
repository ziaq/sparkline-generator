import { DynamicModule, Global, Module, Provider } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { RedisParams } from './interfaces/redis.interfaces';
import { RedisStatusHandler } from './services/redis-status-handler.service';
import { RedisProvider } from './redis-provider.service';

@Global()
@Module({})
export class RedisProviderModule {
  static forRoot(RedisParams: RedisParams[]): DynamicModule {
    const redisInstanceProviders = RedisParams.map(
      (instanceParams): Provider => ({
        provide: instanceParams.providerToken,
        useFactory: (
          configService: ConfigService,
          redisStatusHandler: RedisStatusHandler,
        ) => {
          return new RedisProvider(
            configService,
            redisStatusHandler,
            instanceParams,
          );
        },
        inject: [ConfigService, RedisStatusHandler],
      }),
    );

    return {
      module: RedisProviderModule,
      providers: [...redisInstanceProviders, RedisStatusHandler],
      exports: redisInstanceProviders,
    };
  }
}
