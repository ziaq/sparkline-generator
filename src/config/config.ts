import { registerAs } from '@nestjs/config';

import { RedisSettings } from '../modules/resources/redis/interfaces/redis.interfaces';

import { CONFIG } from './config.constants';

export interface Config {
  microserviceName: string;
  nodeEnv: 'development' | 'production' | 'test';
  serverIp: string;
  serverPort: number;
  telegramBotToken: string;
  errorAlertTgChannelId: string;
  redis: {
    main: RedisSettings;
  };
  mongoDb: string;
  staticAssetsServerUrl: string;
}

export default registerAs(
  CONFIG,
  (): Config => ({
    microserviceName: process.env.MICROSERVICE_NAME,
    nodeEnv: process.env.NODE_ENV as Config['nodeEnv'],
    serverIp: process.env.SERVER_IP,
    serverPort: Number(process.env.SERVER_PORT),
    telegramBotToken: process.env.TELEGRAM_BOT_TOKEN,
    errorAlertTgChannelId: process.env.ERROR_ALERT_TG_CHANNEL_ID,
    redis: {
      main: {
        host: process.env.REDIS_MAIN_HOST,
        port: Number(process.env.REDIS_MAIN_PORT),
        password: process.env.REDIS_MAIN_PASSWORD,
      },
    },
    mongoDb: process.env.MONGODB,
    staticAssetsServerUrl: process.env.STATIC_ASSETS_SERVER_URL,
  }),
);
