import { Global, Module } from '@nestjs/common';

import { TgMsgSender } from './tg-msg-sender.service';

@Global()
@Module({
  providers: [TgMsgSender],
  exports: [TgMsgSender],
})
export class TgMsgSenderModule {}
