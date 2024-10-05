import { Inject, Injectable } from '@nestjs/common';
import axios, { AxiosInstance } from 'axios';
import { HttpsProxyAgent } from 'https-proxy-agent';

import { TokenAddress } from '../../../../../../models/token-address.model';
import { wait } from '../../../../../../utils/wait';
import { StandardProxy } from '../../../../../resources/proxies-repository/models/standard-proxy.model';
import { PROXIES_REPOSITORY } from '../../../../../resources/proxies-repository/proxies-repository.constants';
import { ProxiesRepository } from '../../../../../resources/proxies-repository/proxies-repository.service';
import { CustomErrorHandler } from '../../../../../shared/custom-error-handler/custom-error-handler.service';
import { CUSTOM_LOGGER } from '../../../../../shared/custom-logger/custom-logger.constants';
import { CustomLogger } from '../../../../../shared/custom-logger/custom-logger.service';
import { TimeDataForChart } from '../../time-data-for-chart.service';
import { ohlcvGeckoZod } from '../models/ohlcv.model';
import { OhlcvArrayGecko } from '../types/ohlcv.types';
import { calcPriceChange } from '../utils/calc-price-change';

type ReqParams = {
  aggregate: 5 | 15;
  limit: string;
  before_timestamp?: number;
};

@Injectable()
export class GeckoApiFetcher {
  private currentProxyIndex = 0;
  private errorCount = 0;
  private temporarilyIgnored: TokenAddress[] = [];
  private readonly standardProxies: StandardProxy[];

  constructor(
    private readonly errorHandler: CustomErrorHandler,
    @Inject(CUSTOM_LOGGER) private readonly logger: CustomLogger,
    @Inject(PROXIES_REPOSITORY) proxiesRepository: ProxiesRepository,
  ) {
    this.standardProxies = proxiesRepository.getStandardProxies();
  }

  private genAxiosInstance() {
    const proxy = this.standardProxies[this.currentProxyIndex];
    this.currentProxyIndex =
      (this.currentProxyIndex + 1) % this.standardProxies.length;

    let proxyAgent = null;
    if (proxy) {
      const proxyUrl = new URL(
        `http://${proxy.username}:${proxy.password}@${proxy.host}:${proxy.port}`,
      );
      proxyAgent = new HttpsProxyAgent(proxyUrl);
    }

    const axiosInstance = axios.create({
      httpsAgent: proxyAgent,
      httpAgent: proxyAgent,
    });

    return axiosInstance;
  }

  private async fetchRawChartData(
    liqPair: string,
    axiosInstance: AxiosInstance,
    params: ReqParams,
  ) {
    const geckoResp = await axiosInstance.get(
      `https://api.geckoterminal.com/api/v2/networks/eth/pools/${liqPair}/ohlcv/minute`,
      {
        params: params,
        timeout: 15000, // 15 sec
        signal: AbortSignal.timeout(15000),
      },
    );

    return geckoResp.data.data.attributes.ohlcv_list;
  }

  public async getChartData(
    tokenAddress: TokenAddress,
    liqPair: string,
    chartTimeData: TimeDataForChart,
    attempts = 1,
  ) {
    if (this.temporarilyIgnored.includes(tokenAddress)) return null;

    let {
      threeWeeksAgoTimestamp,
      tenDaysAgoTimestamp,
      timestampSinceCulcPriceChange,
    } = chartTimeData;
    const { timeframe } = chartTimeData;
    const axiosInstance = this.genAxiosInstance();

    if (threeWeeksAgoTimestamp) {
      threeWeeksAgoTimestamp = Math.floor(threeWeeksAgoTimestamp / 1000); // Transform in seconds format
    }
    if (tenDaysAgoTimestamp) {
      tenDaysAgoTimestamp = Math.floor(tenDaysAgoTimestamp / 1000);
    }
    if (timestampSinceCulcPriceChange) {
      timestampSinceCulcPriceChange = Math.floor(
        timestampSinceCulcPriceChange / 1000,
      );
    }

    try {
      const params: ReqParams = {
        aggregate: timeframe,
        limit: '1000', // Maximum value, returns chart data from a random date ranging from 10 days to several months
      };

      let ohlcv: OhlcvArrayGecko;

      if (tenDaysAgoTimestamp) {
        // Due to 1000 bars limit you have to request in two parts for old token 3 weeks chart info
        const ohlcvLaterPart = await this.fetchRawChartData(
          liqPair,
          axiosInstance,
          params,
        );

        params.before_timestamp = tenDaysAgoTimestamp;
        const ohlcvEarlierPart = await this.fetchRawChartData(
          liqPair,
          axiosInstance,
          params,
        );

        const combinedOhlcvArr = [...ohlcvLaterPart, ...ohlcvEarlierPart];
        const combinedOhlcvMap = new Map(
          combinedOhlcvArr.map((bar) => [bar[0], bar]),
        ); // Deleting all dublicates
        ohlcv = Array.from(combinedOhlcvMap.values()).sort(
          (a, b) => b[0] - a[0],
        );
      } else {
        ohlcv = await this.fetchRawChartData(liqPair, axiosInstance, params);
      }

      if (threeWeeksAgoTimestamp) {
        // If token is old we need remove all bars with timestamp older than threeWeeksAgoTimestamp
        ohlcv = ohlcv.filter((bar) => bar[0] > threeWeeksAgoTimestamp);
      }

      ohlcvGeckoZod.parse(ohlcv[0]); // Only the first bar is checked as all bars are identical

      const lastBar = ohlcv.length - 1;
      if (!ohlcv[lastBar]) throw new Error('No data');

      const chartOnlyClosePrices = [ohlcv[lastBar][1]];
      const priceChange = calcPriceChange(
        ohlcv,
        timestampSinceCulcPriceChange,
        true,
      );

      // Only maximum price from every bar
      for (let i = lastBar; i >= 0; i--) {
        chartOnlyClosePrices.push(ohlcv[i][4]);
      }

      this.errorCount = 0;
      return { chartOnlyClosePrices, priceChange };
    } catch (error) {
      this.errorCount++;

      if (this.errorCount === 20) {
        this.errorHandler.logAndNotifyInTg(
          `Multiple consecutive errors, errorCount === 20. ${error.toString()}`,
          this.constructor.name,
          this.getChartData.name,
          `tokenAddress ${tokenAddress} liqPair ${liqPair}`,
        );

        setTimeout(() => {
          this.errorCount = 0;
          this.logger.log(
            `Reset errorCount to 0 after 15 min`,
            this.constructor.name,
          );
        }, 870000); // 14 min 30 sec
      }

      if (error.toString() === 'Error: No data') {
        this.logger.error(
          `Failed ${this.getChartData.name}, add to temporarilyIgnored token ${tokenAddress}. ${error.toString()}`,
        );
        this.temporarilyIgnored.push(tokenAddress);

        // Stop ignoring after 15 min
        setTimeout(() => {
          this.temporarilyIgnored = this.temporarilyIgnored.filter(
            (el) => el !== tokenAddress,
          );
          this.logger.log(
            `Deleted from temporarilyIgnored token ${tokenAddress}`,
            this.constructor.name,
          );
        }, 870000); // 14 min 30 sec

        return null;
      }

      this.logger.error(
        `Failed ${this.getChartData.name}. tokenAddress ${tokenAddress}. ${error.toString()}`,
        this.constructor.name,
      );
      if (attempts === 0) return null;

      await wait(5000);

      return await this.getChartData(
        tokenAddress,
        liqPair,
        chartTimeData,
        attempts - 1,
      );
    }
  }
}
