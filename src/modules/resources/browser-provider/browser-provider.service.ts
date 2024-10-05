import { Inject, Injectable, OnModuleInit } from '@nestjs/common';
import { Browser } from 'puppeteer';
import puppeteer from 'puppeteer-extra';

import { wait } from '../../../utils/wait';
import { CustomErrorHandler } from '../../shared/custom-error-handler/custom-error-handler.service';
import { HighQualityProxy } from '../proxies-repository/models/high-quality-proxy.model';
import { ProxiesRepository } from '../proxies-repository/proxies-repository.service';
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
import { PROXIES_REPOSITORY } from '../proxies-repository/proxies-repository.constants';

@Injectable()
export class BrowserProvider implements OnModuleInit {
  private proxiedBrowser: Browser | null = null;

  private isBrowserClosingInProgress = false;
  private highQualityProxies: HighQualityProxy[];
  private highQualityProxiesFallback: HighQualityProxy[];

  constructor(
    private readonly errorHandler: CustomErrorHandler,
    @Inject(PROXIES_REPOSITORY) private proxiesRepository: ProxiesRepository,
  ) {}

  onModuleInit() {
    puppeteer.use(StealthPlugin());

    this.highQualityProxies = this.proxiesRepository.getHighQualityProxies();
    this.highQualityProxiesFallback =
      this.proxiesRepository.getHighQualityProxiesFallback();
  }

  public async getProxiedBrowserAndProxy({
    isNeedUseFallbackProxy,
  }: {
    isNeedUseFallbackProxy: boolean;
  }) {
    try {
      const proxy = isNeedUseFallbackProxy
        ? this.highQualityProxiesFallback[0]
        : this.highQualityProxies[0];

      if (!this.proxiedBrowser) {
        this.proxiedBrowser = await puppeteer.launch({
          // @ts-expect-error due to incorrect type problems
          headless: 'new',
          args: [`--proxy-server=${proxy.host}:${proxy.port}`],
        });
      }

      return {
        proxiedBrowser: this.proxiedBrowser,
        proxy,
      };
    } catch (error) {
      this.errorHandler.logAndNotifyInTg(
        error.toString(),
        this.constructor.name,
        this.getProxiedBrowserAndProxy.name,
        `isNeedUseFallbackProxy ${isNeedUseFallbackProxy}`,
      );

      return null;
    }
  }

  public async closeProxiedBrowser() {
    try {
      if (this.isBrowserClosingInProgress) {
        await wait(1500); // Prevents rerun while a previous process is still running
        return;
      }
      this.isBrowserClosingInProgress = true;

      if (this.proxiedBrowser) {
        const browserToClose = this.proxiedBrowser;
        this.proxiedBrowser = null;
        await browserToClose.close();
      }
    } catch (error) {
      this.errorHandler.logAndNotifyInTg(
        error.toString(),
        this.constructor.name,
        this.getProxiedBrowserAndProxy.name,
      );
    } finally {
      this.isBrowserClosingInProgress = false;
    }
  }
}
