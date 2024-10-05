import { Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectModel } from '@nestjs/mongoose';
import axios from 'axios';
import Redis from 'ioredis';
import { Model } from 'mongoose';

import { Config } from '../../../../config/config';
import { CONFIG } from '../../../../config/config.constants';
import { ActualSparkline } from '../../../../models/actual-sparkline.model';
import { NoteworthToken } from '../../../../models/noteworth-token.model';
import { TokenAddress } from '../../../../models/token-address.model';
import { wait } from '../../../../utils/wait';
import { REDIS_PROVIDER_MAIN_8 } from '../../../resources/redis/redis-provider.constants';
import { RedisProvider } from '../../../resources/redis/redis-provider.service';
import { CustomErrorHandler } from '../../../shared/custom-error-handler/custom-error-handler.service';
import { TimeDataForChart } from '../sparkline-building/time-data-for-chart.service';

import { Sparkline } from './../../../../models/sparkline.model';

@Injectable()
export class SparklineSaver {
  private redisMain8: Redis;
  private readonly config: Config;

  constructor(
    private readonly errorHandler: CustomErrorHandler,
    configService: ConfigService,
    @Inject(REDIS_PROVIDER_MAIN_8) redisProviderMain8: RedisProvider,
    @InjectModel(Sparkline.name) private sparklineModel: Model<Sparkline>,
    @InjectModel(ActualSparkline.name)
    private actualSparklineModel: Model<ActualSparkline>,
  ) {
    this.config = configService.get<Config>(CONFIG);
    this.redisMain8 = redisProviderMain8.getInstance();
  }

  private async uploadToStaticAssetsServer(
    svg: string,
    fileName: string,
    attempts = 3,
  ) {
    try {
      await axios({
        method: 'post',
        url: `${this.config.staticAssetsServerUrl}/api/upload-sparkline`,
        data: {
          fileName: `${fileName}.svg`,
          svgContent: svg,
        },
      });
    } catch (error) {
      if (attempts === 0)
        throw new Error(
          `Failed ${this.uploadToStaticAssetsServer.name} ${error.toString()}`,
        );
      await wait(3000);

      return await this.uploadToStaticAssetsServer(svg, fileName, attempts - 1);
    }
  }

  private async recordToDb(
    tokenAddress: TokenAddress,
    noteworthToken: NoteworthToken,
    chartTimeData: TimeDataForChart,
    priceChange: string | null,
    fileName: string,
    attempts = 3,
  ) {
    try {
      const { currentDate, priceChangePeriod, timeframe } = chartTimeData;

      const sparklineDocument = new this.sparklineModel({
        tokenAddress,
        fileName,
        date: currentDate.toISOString(),
        priceChangePeriod,
        priceChange,
        timeframe,
      });

      const actualSparklineDocument = new this.actualSparklineModel({
        tokenAddress,
        fileName,
      });

      await sparklineDocument.save();
      await actualSparklineDocument.save();

      noteworthToken.sparkline = {
        fileName,
        date: currentDate.toISOString(),
        priceChangePeriod,
        priceChange,
        timeframe,
      };

      await this.redisMain8.set(tokenAddress, JSON.stringify(noteworthToken));
    } catch (error) {
      if (attempts === 0)
        throw new Error(
          `Failed ${this.uploadToStaticAssetsServer.name} ${error.toString()}`,
        );
      await wait(3000);

      return await this.recordToDb(
        tokenAddress,
        noteworthToken,
        chartTimeData,
        priceChange,
        fileName,
        attempts - 1,
      );
    }
  }

  public async saveSparkline(
    tokenAddress: TokenAddress,
    noteworthToken: NoteworthToken,
    chartTimeData: TimeDataForChart,
    priceChange: string,
    svg: string,
  ) {
    try {
      const customAlphabet = (await import('nanoid')).customAlphabet;
      const nanoid = customAlphabet(
        '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz',
        11,
      );
      const fileName = nanoid();

      await this.uploadToStaticAssetsServer(svg, fileName);

      await this.recordToDb(
        tokenAddress,
        noteworthToken,
        chartTimeData,
        priceChange,
        fileName,
      );
    } catch (error) {
      this.errorHandler.logAndNotifyInTg(
        error.toString(),
        this.constructor.name,
        this.uploadToStaticAssetsServer.name,
        `tokenAddress ${tokenAddress}`,
      );
    }
  }
}
