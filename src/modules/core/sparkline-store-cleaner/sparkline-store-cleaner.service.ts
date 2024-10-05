import { Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectConnection, InjectModel } from '@nestjs/mongoose';
import axios from 'axios';
import Redis from 'ioredis';
import { Connection, Model } from 'mongoose';
import { lock, ReleaseFunction } from 'simple-redis-mutex';

import { Config } from '../../../config/config';
import { CONFIG } from '../../../config/config.constants';
import { ActualSparkline } from '../../../models/actual-sparkline.model';
import { Sparkline, sparklineZod } from '../../../models/sparkline.model';
import { REDIS_PROVIDER_MAIN_8 } from '../../resources/redis/redis-provider.constants';
import { RedisProvider } from '../../resources/redis/redis-provider.service';
import { CustomErrorHandler } from '../../shared/custom-error-handler/custom-error-handler.service';
import { CUSTOM_LOGGER } from '../../shared/custom-logger/custom-logger.constants';
import { CustomLogger } from '../../shared/custom-logger/custom-logger.service';
import { MethodFreezeAlert } from '../../shared/method-freeze-alert/method-freeze-alert.service';

@Injectable()
export class SparklineStoreCleaner {
  private readonly redisMain8: Redis;
  private expiredSparklines: Sparkline[];
  private readonly staticAssetsServerUrl: Config['staticAssetsServerUrl'];

  constructor(
    private readonly errorHandler: CustomErrorHandler,
    @Inject(CUSTOM_LOGGER) private readonly logger: CustomLogger,
    private readonly methodFreezeAlert: MethodFreezeAlert,
    @InjectConnection() private mongoConnection: Connection,
    @InjectModel(Sparkline.name) private sparklineModel: Model<Sparkline>,
    @InjectModel(ActualSparkline.name)
    private actualSparklineModel: Model<ActualSparkline>,
    @Inject(REDIS_PROVIDER_MAIN_8) redisProviderMain8: RedisProvider,
    configService: ConfigService,
  ) {
    const config = configService.get<Config>(CONFIG);
    this.staticAssetsServerUrl = config.staticAssetsServerUrl;
    this.redisMain8 = redisProviderMain8.getInstance();
  }

  private async deleteFromDb(sparkline: Sparkline) {
    let release: ReleaseFunction;
    const tokenAddress = sparkline.tokenAddress;

    try {
      const session = await this.mongoConnection.startSession();
      session.startTransaction();
      let deletedCount: number;

      try {
        await this.sparklineModel.deleteOne({ tokenAddress });
        const deleteResult = await this.actualSparklineModel.deleteOne({
          fileName: sparkline.fileName,
        });
        deletedCount = deleteResult.deletedCount;
        await session.commitTransaction();
      } catch (error) {
        await session.abortTransaction();
        throw error;
      } finally {
        session.endSession();
      }

      if (deletedCount !== 0) {
        release = await lock(this.redisMain8, tokenAddress, {
          timeoutMillis: 60000,
        });

        const infoDb8String = await this.redisMain8.get(sparkline.tokenAddress);
        if (!infoDb8String)
          throw new Error(`Token ${sparkline.tokenAddress} is missing in db8`);
        const infoDb8 = JSON.parse(infoDb8String);

        delete infoDb8.sparkline;
        await this.redisMain8.set(tokenAddress, JSON.stringify(infoDb8));
        release();
      }
    } catch (error) {
      if (release) release();
      throw new Error(
        `[${this.deleteFromDb.name}] tokenAddress ${tokenAddress} ${error.toString()}`,
      );
    }
  }

  public async cleanSparklineStore() {
    const timerId = this.methodFreezeAlert.startMonitoring(
      this.constructor.name,
      this.cleanSparklineStore.name,
    );

    try {
      const oneHoursAgo = new Date(Date.now() - 60 * 60 * 1000);
      this.expiredSparklines = await this.sparklineModel.find({
        date: { $lt: oneHoursAgo },
      });
      this.expiredSparklines.forEach((expiredSparkline) => {
        sparklineZod.parse(expiredSparkline);
      });

      for (let i = 0; i < this.expiredSparklines.length; i++) {
        const sparkline = this.expiredSparklines[i];

        await axios({
          method: 'delete',
          url: `${this.staticAssetsServerUrl}/api/delete-sparkline/${sparkline.fileName}.svg`,
        });

        await this.deleteFromDb(sparkline);
      }
    } catch (error) {
      this.errorHandler.logAndNotifyInTg(
        error.toString(),
        this.constructor.name,
        this.cleanSparklineStore.name,
      );
    } finally {
      this.methodFreezeAlert.stopMonitoring(timerId);
    }

    this.logger.log('Sparkline store cleaned', this.constructor.name);
  }
}
