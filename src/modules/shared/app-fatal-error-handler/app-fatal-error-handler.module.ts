import { Module } from '@nestjs/common';

import { AppFatalErrorHandler } from './app-fatal-error-handler.service';

@Module({
  providers: [AppFatalErrorHandler],
  exports: [AppFatalErrorHandler],
})
export class AppFatalErrorHandlerModule {}
