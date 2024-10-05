import { Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { Config } from '../../../config/config';
import { CONFIG } from '../../../config/config.constants';
import { CUSTOM_LOGGER } from '../custom-logger/custom-logger.constants';
import { CustomLogger } from '../custom-logger/custom-logger.service';
import { TgMsgSender } from '../tg-msg-sender/tg-msg-sender.service';

@Injectable()
export class AppFatalErrorHandler {
  private readonly microserviceName: Config['microserviceName'];
  private readonly errorAlertTgChannelId: Config['errorAlertTgChannelId'];

  constructor(
    configService: ConfigService,
    @Inject(CUSTOM_LOGGER) private readonly logger: CustomLogger,
    private readonly tgMsgSender: TgMsgSender,
  ) {
    const config = configService.get<Config>(CONFIG);
    this.microserviceName = config.microserviceName;
    this.errorAlertTgChannelId = config.errorAlertTgChannelId;
  }

  public setUpHandlers() {
    process.on('uncaughtException', (error) => {
      this.logger.error(
        `Uncaught exception. ${error.toString()}`,
        this.constructor.name,
      );
      this.tgMsgSender
        .send(
          `Microservice ${this.microserviceName} died`,
          this.errorAlertTgChannelId,
        )
        .then(() => process.exit(1));
    });

    process.on('unhandledRejection', (reason, promise) => {
      this.logger.error(
        `Unhandled promise rejection, promise ${JSON.stringify(promise)} reason ${reason}`,
        this.constructor.name,
      );
      this.tgMsgSender
        .send(
          `Module ${this.microserviceName} died`,
          this.errorAlertTgChannelId,
        )
        .then(() => process.exit(1));
    });
  }
}
