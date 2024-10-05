import { Inject, Injectable } from '@nestjs/common';
import Redis from 'ioredis';

import { CustomErrorHandler } from '../../../shared/custom-error-handler/custom-error-handler.service';
import { CUSTOM_LOGGER } from '../../../shared/custom-logger/custom-logger.constants';
import { CustomLogger } from '../../../shared/custom-logger/custom-logger.service';
import { RedisParams } from '../interfaces/redis.interfaces';

@Injectable()
export class RedisStatusHandler {
  constructor(
    @Inject(CUSTOM_LOGGER) private readonly logger: CustomLogger,
    private readonly errorHandler: CustomErrorHandler,
  ) {}

  public startMonitoring(
    redis: Redis,
    redisInstanceName: RedisParams['providerToken'],
  ) {
    let isErrorSent = false;
    let sendErrorTimeout: NodeJS.Timeout | null = null;
    let resetIsErrorSentTimeout: NodeJS.Timeout | null = null;

    redis.on('ready', () => {
      this.logger.log(
        `Connected to ${redisInstanceName}`,
        this.constructor.name,
      );

      clearTimeout(sendErrorTimeout);
      isErrorSent = false;
      clearTimeout(resetIsErrorSentTimeout);
    });

    redis.on('error', (error) => {
      if (isErrorSent) return;

      isErrorSent = true;
      resetIsErrorSentTimeout = setTimeout(() => {
        isErrorSent = false;
      }, 600000);

      // Sends an error if the connection is not re-established in 15 seconds
      sendErrorTimeout = setTimeout(() => {
        this.errorHandler.logAndNotifyInTg(
          `Connection failed ${error.toString()}`,
          this.constructor.name,
          this.startMonitoring.name,
          `redisInstanceName ${redisInstanceName}`,
        );
      }, 15000);
    });
  }
}
