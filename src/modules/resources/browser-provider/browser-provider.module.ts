import { Module } from '@nestjs/common';

import { ProxiesRepositoryModule } from '../proxies-repository/proxies-repository.module';

import { BrowserProvider } from './browser-provider.service';

@Module({
  imports: [ProxiesRepositoryModule],
  providers: [BrowserProvider],
  exports: [BrowserProvider],
})
export class BrowserProviderModule {}
