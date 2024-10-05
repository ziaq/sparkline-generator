import { Inject, Injectable } from '@nestjs/common';
import { Mutex } from 'async-mutex';
import { Page } from 'puppeteer';

import { TokenAddress } from '../../../../../../models/token-address.model';
import { wait } from '../../../../../../utils/wait';
import { BrowserProvider } from '../../../../../resources/browser-provider/browser-provider.service';
import { CustomErrorHandler } from '../../../../../shared/custom-error-handler/custom-error-handler.service';
import { CUSTOM_LOGGER } from '../../../../../shared/custom-logger/custom-logger.constants';
import { CustomLogger } from '../../../../../shared/custom-logger/custom-logger.service';
import { TimeDataForChart } from '../../time-data-for-chart.service';
import { ohlcvCmcZod } from '../models/ohlcv.model';
import { OhlcvArrayCmc } from '../types/ohlcv.types';
import { calcPriceChange } from '../utils/calc-price-change';

@Injectable()
export class CmcScraper {
  private errorCount = 0;
  private isNeedUseFallbackProxy = false;
  private temporarilyIgnored: TokenAddress[] = [];
  private readonly mutex: Mutex;

  constructor(
    @Inject(CUSTOM_LOGGER) private readonly logger: CustomLogger,
    private readonly errorHandler: CustomErrorHandler,
    private readonly browserProvider: BrowserProvider,
  ) {
    this.mutex = new Mutex();
  }

  private async scrapeRawChartData(
    pageInstance: Page,
    poolId: number,
    isReverseOrder: boolean,
    timeframe: 5 | 15,
    untilTimestamp: number,
  ) {
    await pageInstance.goto(
      `https://api.coinmarketcap.com/kline/v3/k-line/candles/1/${poolId}?reverse-order=${isReverseOrder}&usd=true&type=${timeframe}m&to=${untilTimestamp}&countBack=1000`,
    );

    const secondPageContentRaw = await pageInstance.evaluate(() => {
      const pre = document.querySelector('pre');
      if (!pre) throw new Error("Can't find 'pre' on the page");
      return pre.textContent;
    });
    if (!secondPageContentRaw) throw new Error('secondPageContent is empty');

    const secondPageContent = JSON.parse(secondPageContentRaw);
    return secondPageContent.data;
  }

  public async getChartData(
    tokenAddress: TokenAddress,
    liqPair: string,
    chartTimeData: TimeDataForChart,
  ) {
    if (this.temporarilyIgnored.includes(tokenAddress)) return null;

    const {
      currentTimestamp,
      timeframe,
      threeWeeksAgoTimestamp,
      tenDaysAgoTimestamp,
      timestampSinceCulcPriceChange,
    } = chartTimeData;

    try {
      const proxiedBrowserAndProxy = await this.mutex.runExclusive(async () => {
        if (this.isNeedUseFallbackProxy) {
          return await this.browserProvider.getProxiedBrowserAndProxy({
            isNeedUseFallbackProxy: true,
          });
        } else {
          return await this.browserProvider.getProxiedBrowserAndProxy({
            isNeedUseFallbackProxy: false,
          });
        }
      });

      if (!proxiedBrowserAndProxy)
        throw new Error('proxiedBrowserAndProxy === null');
      const { proxiedBrowser, proxy } = proxiedBrowserAndProxy;

      const pageInstance = await proxiedBrowser.newPage();
      pageInstance.setDefaultNavigationTimeout(20000); // 20 sec

      await pageInstance.authenticate({
        username: proxy.username,
        password: proxy.password,
      });

      await pageInstance.setUserAgent(
        'Mozilla/5.0 (Linux; Android 6.0; Nexus 5 Build/MRA58N) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Mobile Safari/537.36',
      );

      await pageInstance.setExtraHTTPHeaders({
        Referer: 'https://www.dextools.io/app/en/pairs',
      });

      await pageInstance.setViewport({ width: 1350, height: 992 });

      await pageInstance.goto(
        `https://api.coinmarketcap.com/dexer/v3/dexer/pair-info?dexer-platform-name=ethereum&address=${liqPair}&t=${currentTimestamp}`,
      );

      const firstPageContentRaw = await pageInstance.evaluate(() => {
        const pre = document.querySelector('pre');
        if (!pre) throw new Error("Can't find 'pre' on the page");
        return pre.textContent;
      });
      if (!firstPageContentRaw) throw new Error('firstPageContentRaw is empty');

      const firstPageContent = JSON.parse(firstPageContentRaw);
      const poolId = firstPageContent.data.poolId;
      const isReverseOrder = firstPageContent.data.reverseOrder;

      let ohlcv: OhlcvArrayCmc;

      if (tenDaysAgoTimestamp) {
        const ohlcvEarlierPart = await this.scrapeRawChartData(
          pageInstance,
          poolId,
          isReverseOrder,
          timeframe,
          tenDaysAgoTimestamp,
        );

        const ohlcvLaterPart = await this.scrapeRawChartData(
          pageInstance,
          poolId,
          isReverseOrder,
          timeframe,
          currentTimestamp,
        );

        const combinedOhlcvArr = [...ohlcvEarlierPart, ...ohlcvLaterPart];
        const combinedOhlcvMap = new Map(
          combinedOhlcvArr.map((bar) => [bar.time, bar]),
        ); // Deleting all dublicates
        ohlcv = Array.from(combinedOhlcvMap.values()).sort(
          (a, b) => a.time - b.time,
        );
      } else {
        ohlcv = await this.scrapeRawChartData(
          pageInstance,
          poolId,
          isReverseOrder,
          timeframe,
          currentTimestamp,
        );
      }

      ohlcvCmcZod.parse(ohlcv[0]); // Only the first bar is checked as all bars are identical

      if (threeWeeksAgoTimestamp) {
        // If token is old we need remove all bars with timestamp older than threeWeeksAgoTimestamp
        ohlcv = ohlcv.filter((bar) => {
          const result = bar.time > threeWeeksAgoTimestamp;
          return result;
        });
      }

      if (!ohlcv[0]) throw new Error('No data');
      const chartOnlyClosePrices = [ohlcv[0].open];

      const priceChange = calcPriceChange(
        ohlcv,
        timestampSinceCulcPriceChange,
        false,
      );

      for (let i = 0; i < ohlcv.length; i++) {
        chartOnlyClosePrices.push(ohlcv[i].close);
      }

      await pageInstance.close();
      this.errorCount = 0;
      return { chartOnlyClosePrices, priceChange };
    } catch (error) {
      this.browserProvider.closeProxiedBrowser();
      await wait(1500);

      this.logger.log(
        `Failed ${this.getChartData.name}, add to temporarilyIgnored token ${tokenAddress}. ${error.toString()}`,
        this.constructor.name,
      );
      this.temporarilyIgnored.push(tokenAddress);

      setTimeout(() => {
        // Stop ignoring after 15 min
        this.temporarilyIgnored = this.temporarilyIgnored.filter(
          (el) => el !== tokenAddress,
        );
        this.logger.log(
          `Deleted from temporarilyIgnored in getChartInfoFromCmc token ${tokenAddress}`,
          this.constructor.name,
        );
      }, 870000); // 14 min 30 sec

      if (this.errorCount === 20) {
        this.isNeedUseFallbackProxy = true;

        this.errorHandler.logAndNotifyInTg(
          `Multiple consecutive errors, errorCount === 20. ${error.toString()}`,
          this.constructor.name,
          this.getChartData.name,
          `tokenAddress ${tokenAddress} liqPair ${liqPair}`,
        );

        setTimeout(() => {
          this.isNeedUseFallbackProxy = false;
          this.errorCount = 0;
          this.logger.log(
            'Reset getChartInfoFromCmc after 4 hours',
            this.constructor.name,
          );
        }, 14400000); // 4 hours
      }

      this.errorCount++;
      return null;
    }
  }
}
