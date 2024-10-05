import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';

import { Config } from './config/config';
import { CONFIG } from './config/config.constants';
import { AppFatalErrorHandler } from './modules/shared/app-fatal-error-handler/app-fatal-error-handler.service';
import { CUSTOM_LOGGER } from './modules/shared/custom-logger/custom-logger.constants';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  const logger = app.get(CUSTOM_LOGGER);
  app.useLogger(logger);

  const appFatalErrorHandler = app.get(AppFatalErrorHandler);
  appFatalErrorHandler.setUpHandlers();

  const configService = app.get(ConfigService);
  const config = configService.get<Config>(CONFIG);

  await app.listen(config.serverPort, config.serverIp);
  logger.log(`Server is running on ${config.serverIp}:${config.serverPort}`);
}
bootstrap();
