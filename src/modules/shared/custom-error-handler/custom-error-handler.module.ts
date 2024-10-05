import { Global, Module } from '@nestjs/common';

import { TgMsgSenderModule } from '../tg-msg-sender/tg-msg-sender.module';

import { CustomErrorHandler } from './custom-error-handler.service';

@Global()
@Module({
  imports: [TgMsgSenderModule],
  providers: [CustomErrorHandler],
  exports: [CustomErrorHandler],
})
export class CustomErrorHandlerModule {}
