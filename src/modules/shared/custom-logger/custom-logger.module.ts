import { Global, Module } from '@nestjs/common';

import { CUSTOM_LOGGER } from './custom-logger.constants';
import { customLoggerProvider } from './custom-logger.provider';

@Global()
@Module({
  providers: [customLoggerProvider],
  exports: [CUSTOM_LOGGER],
})
export class CustomLoggerModule {}
