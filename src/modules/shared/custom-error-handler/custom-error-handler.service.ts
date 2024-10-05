import { Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { Config } from '../../../config/config';
import { CONFIG } from '../../../config/config.constants';
import { CUSTOM_LOGGER } from '../custom-logger/custom-logger.constants';
import { CustomLogger } from '../custom-logger/custom-logger.service';
import { TgMsgSender } from '../tg-msg-sender/tg-msg-sender.service';

@Injectable()
export class CustomErrorHandler {
  private readonly errorAlertTgChannelId: Config['errorAlertTgChannelId'];
  private readonly microserviceName: Config['microserviceName'];

  constructor(
    configService: ConfigService,
    private readonly tgMsgSender: TgMsgSender,
    @Inject(CUSTOM_LOGGER) private readonly logger: CustomLogger,
  ) {
    const config = configService.get<Config>(CONFIG);

    this.microserviceName = config.microserviceName;
    this.errorAlertTgChannelId = config.errorAlertTgChannelId;
  }

  logAndNotifyInTg(
    error: string,
    context: string,
    methodName: string,
    methodArgs?: string,
  ) {
    const errorMsg = methodArgs
      ? `[${methodName}] Method arguments: ${methodArgs}. ${error}`
      : `[${methodName}] ${error}`;

    const telegramErrorMsg = `[${this.microserviceName}] [${context}] ${errorMsg}`;

    this.logger.error(errorMsg, context);
    this.tgMsgSender.send(telegramErrorMsg, this.errorAlertTgChannelId);
  }
}
