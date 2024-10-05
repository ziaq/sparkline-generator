import { CUSTOM_LOGGER } from './custom-logger.constants';
import { CustomLogger } from './custom-logger.service';

export const customLoggerProvider = {
  provide: CUSTOM_LOGGER,
  useFactory: () => {
    const logger = new CustomLogger();
    logger.init();
    return logger;
  },
};
