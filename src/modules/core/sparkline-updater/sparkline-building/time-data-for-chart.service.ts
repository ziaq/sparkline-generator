import { Injectable } from '@nestjs/common';

import { NoteworthToken } from '../../../../models/noteworth-token.model';

export type TimeDataForChart = {
  currentDate: Date;
  currentTimestamp: number;
  hoursSinceLaunch: number;
  tenDaysAgoTimestamp: number;
  threeWeeksAgoTimestamp: number;
  priceChangePeriod: string;
  timestampSinceCulcPriceChange: number;
  timeframe: 5 | 15;
};

@Injectable()
export class TimeDataForChartService {
  private genPriceChangeTimeData(hoursSinceLaunch: number, currentDate: Date) {
    switch (true) {
      case hoursSinceLaunch <= 24:
        return {
          priceChangePeriod: null,
          timestampSinceCulcPriceChange: null,
        };

      case hoursSinceLaunch <= 48:
        return {
          priceChangePeriod: '24h',
          timestampSinceCulcPriceChange: currentDate.getTime() - 86400000, // 24h
        };

      case hoursSinceLaunch <= 72:
        return {
          priceChangePeriod: '2 days',
          timestampSinceCulcPriceChange: currentDate.getTime() - 172800000, // 2 days
        };

      case hoursSinceLaunch <= 168:
        return {
          priceChangePeriod: '3 days',
          timestampSinceCulcPriceChange: currentDate.getTime() - 259200000, // 3 days
        };

      default:
        return {
          priceChangePeriod: '5 days',
          timestampSinceCulcPriceChange: currentDate.getTime() - 432000000, // 5 days
        };
    }
  }

  public genTimeData(
    tokenLaunchDate: NoteworthToken['additionDate'],
  ): TimeDataForChart {
    const currentDate = new Date();
    const currentTimestamp = currentDate.getTime();
    const additionDate = new Date(tokenLaunchDate);

    const msSinceLaunch = currentTimestamp - additionDate.getTime();
    const hoursSinceLaunch = Math.floor(msSinceLaunch / 3600000);

    const { priceChangePeriod, timestampSinceCulcPriceChange } =
      this.genPriceChangeTimeData(hoursSinceLaunch, currentDate);

    // If token is old we need remove all bars with timestamp older than threeWeeksAgoTimestamp
    let threeWeeksAgoTimestamp = null;
    if (hoursSinceLaunch > 504) {
      // 3 Weeks
      threeWeeksAgoTimestamp = currentTimestamp - 1814400000; // 3 weeks
    }

    let tenDaysAgoTimestamp = null;
    if (hoursSinceLaunch > 249) {
      // Need due to request chart info limit
      tenDaysAgoTimestamp = currentTimestamp - 896400000; // 249 hours which is about 10 days
    }

    const timeframe = hoursSinceLaunch > 48 ? 15 : 5;

    return {
      currentDate,
      currentTimestamp,
      hoursSinceLaunch,
      tenDaysAgoTimestamp,
      threeWeeksAgoTimestamp,
      priceChangePeriod,
      timestampSinceCulcPriceChange,
      timeframe,
    };
  }
}
