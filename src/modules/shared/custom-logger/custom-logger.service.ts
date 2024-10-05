import { Injectable, LoggerService } from '@nestjs/common';
import { createLogger, format, transports } from 'winston';
const DailyRotateFile = require('winston-daily-rotate-file');

@Injectable()
export class CustomLogger implements LoggerService {
  private logger: ReturnType<typeof createLogger>;

  init() {
    const { combine, timestamp, printf } = format;

    const customFormat = printf(({ level, message, timestamp }) => {
      const date = new Date(timestamp);
      const formattedTimestamp = `${date.toLocaleString('en-GB', { hour12: false })} :${String(date.getMilliseconds()).padStart(3, '0')}`;

      return `${formattedTimestamp} ${level}: ${message}`;
    });

    this.logger = createLogger({
      level: 'info',
      format: combine(timestamp(), customFormat),
      transports: [
        new DailyRotateFile({
          filename: 'logs/all-%DATE%.log',
          datePattern: 'DD-MM-YYYY',
          maxSize: '10m',
          maxFiles: '3d',
          level: 'info',
        }),
        new DailyRotateFile({
          filename: 'logs/errors-%DATE%.log',
          datePattern: 'DD-MM-YYYY',
          maxSize: '10m',
          maxFiles: '3d',
          level: 'error',
        }),
        new transports.Console(),
      ],
    });
  }

  private logMessageOnLevel(
    level: 'info' | 'error' | 'warn',
    message: string,
    context: string = 'App',
  ) {
    this.logger[level](`[${context}] ${message}`);
  }

  public log(message: string, context?: string) {
    this.logMessageOnLevel('info', message, context);
  }

  public error(message: string, context?: string) {
    this.logMessageOnLevel('error', message, context);
  }

  public warn(message: string, context?: string) {
    this.logMessageOnLevel('warn', message, context);
  }
}
