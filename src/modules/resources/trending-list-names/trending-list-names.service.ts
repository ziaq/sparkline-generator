import { Injectable } from '@nestjs/common';

import {
  TrendingNameInDb,
  TrendingNameInDbMain,
} from '../../../models/trending-list-names.model';

@Injectable()
export class TrendingListNames {
  private trendingDbNamesMain: TrendingNameInDbMain[] = [
    'safeguardTrending',
    'buyTechTrending',
    'dexscreenerTrending',
    'dextoolsTrending',
    'moontokTrending',
    'cmcDexTrending',
  ];

  private trendingDbNamesEnhanced: TrendingNameInDb[] = [
    ...this.trendingDbNamesMain,
    'lastUpdatedTrending',
  ];
  private trendingDbNamesAll: TrendingNameInDb[] = [
    ...this.trendingDbNamesEnhanced,
    'topTokensTrendingItemized',
  ];

  public getMainNames() {
    return this.trendingDbNamesMain;
  }

  public getEnhancedNames() {
    return this.trendingDbNamesEnhanced;
  }

  public getAllNames() {
    return this.trendingDbNamesAll;
  }
}
