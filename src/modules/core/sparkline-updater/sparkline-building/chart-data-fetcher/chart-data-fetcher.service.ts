import { Injectable } from '@nestjs/common';

import { TokenAddress } from '../../../../../models/token-address.model';
import { TimeDataForChart } from '../time-data-for-chart.service';

import { CmcScraper } from './services/cmc-scraper.service';
import { GeckoApiFetcher } from './services/gecko-api-fetcher.service';

@Injectable()
export class ChartDataFetcher {
  constructor(
    private readonly geckoApiFetcher: GeckoApiFetcher,
    private readonly cmcScraper: CmcScraper,
  ) {}

  public async fetchChartData(
    tokenAddress: TokenAddress,
    liqPair: string,
    chartTimeData: TimeDataForChart,
  ) {
    const chartInfoFromGeckoApi = await this.geckoApiFetcher.getChartData(
      tokenAddress,
      liqPair,
      chartTimeData,
    );
    if (chartInfoFromGeckoApi) return chartInfoFromGeckoApi;

    const chartInfoFromCmc = await this.cmcScraper.getChartData(
      tokenAddress,
      liqPair,
      chartTimeData,
    );
    return chartInfoFromCmc;
  }
}
