import {
  Inject,
  Injectable,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Telegraf } from 'telegraf';

import { Config } from '../../../config/config';
import { CONFIG } from '../../../config/config.constants';
import { CUSTOM_LOGGER } from '../custom-logger/custom-logger.constants';
import { CustomLogger } from '../custom-logger/custom-logger.service';

@Injectable()
export class TgMsgSender implements OnModuleInit, OnModuleDestroy {
  private bot: Telegraf;
  private readonly errorAlertTgChannelId: Config['errorAlertTgChannelId'];

  constructor(
    @Inject(CUSTOM_LOGGER) private readonly logger: CustomLogger,
    private readonly configService: ConfigService,
  ) {
    const config = configService.get<Config>(CONFIG);

    this.bot = new Telegraf(config.telegramBotToken);
    this.errorAlertTgChannelId = config.errorAlertTgChannelId;
  }

  onModuleInit() {
    const nodeEnv = this.configService.get('NODE_ENV');

    if (nodeEnv !== 'test') {
      this.bot.launch();
    }
  }

  onModuleDestroy() {
    this.bot.stop('Graceful stop');
  }

  async send(message: string, chatId: string = this.errorAlertTgChannelId) {
    try {
      await this.bot.telegram.sendMessage(chatId, message, {
        parse_mode: 'HTML',
        // @ts-expect-error due to some type problems
        disable_web_page_preview: true,
      });
    } catch (error) {
      this.logger.error(
        `Can not send message to telegram. ${error.toString()}}`,
        this.constructor.name,
      );
    }
  }
}
