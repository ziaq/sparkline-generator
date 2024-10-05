import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

import { Config } from '../../../config/config';
import { CONFIG } from '../../../config/config.constants';

import { RedisParams, RedisSettings } from './interfaces/redis.interfaces';
import { RedisStatusHandler } from './services/redis-status-handler.service';

@Injectable()
export class RedisProvider {
  private readonly redis: Redis;

  constructor(
    configService: ConfigService,
    redisStatusHandler: RedisStatusHandler,
    redisParams: RedisParams,
  ) {
    const config = configService.get<Config>(CONFIG);
    const redisSettings: RedisSettings =
      config.redis[redisParams.redisNodeName];

    this.redis = new Redis({
      host: redisSettings.host,
      port: redisSettings.port,
      password: redisSettings.password,
      db: redisParams.dbNum,
    });

    redisStatusHandler.startMonitoring(this.redis, redisParams.providerToken);
  }

  public getInstance() {
    return this.redis;
  }
}
