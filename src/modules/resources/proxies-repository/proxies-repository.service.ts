import { Injectable } from '@nestjs/common';
import { Model } from 'mongoose';

import {
  highQualityProxiesZod,
  HighQualityProxy,
} from './models/high-quality-proxy.model';
import { HighQualityProxyFallback } from './models/high-quality-proxy-fallback.model';
import {
  standardProxiesZod,
  StandardProxy,
} from './models/standard-proxy.model';

@Injectable()
export class ProxiesRepository {
  private standardProxies: StandardProxy[];
  private highQualityProxies: HighQualityProxy[];
  private highQualityProxiesFallback: HighQualityProxyFallback[];

  constructor(
    private standardProxyModel: Model<StandardProxy>,
    private highQualityProxyModel: Model<HighQualityProxy>,
    private highQualityProxyFallbackModel: Model<HighQualityProxyFallback>,
  ) {}

  async init() {
    try {
      this.standardProxies = await this.standardProxyModel.find();
      standardProxiesZod.parse(this.standardProxies);

      this.highQualityProxies = await this.highQualityProxyModel.find();
      highQualityProxiesZod.parse(this.highQualityProxies);

      this.highQualityProxiesFallback =
        await this.highQualityProxyFallbackModel.find();
      highQualityProxiesZod.parse(this.highQualityProxiesFallback);
    } catch (error) {
      throw new Error(
        `[${this.constructor.name}] Can't init. ${error.toString()}`,
      );
    }
  }

  public getStandardProxies() {
    return this.standardProxies;
  }

  public getHighQualityProxies() {
    return this.highQualityProxies;
  }

  public getHighQualityProxiesFallback() {
    return this.highQualityProxiesFallback;
  }
}
