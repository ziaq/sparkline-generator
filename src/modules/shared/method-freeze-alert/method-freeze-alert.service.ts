import { Injectable } from '@nestjs/common';

import { CustomErrorHandler } from '../custom-error-handler/custom-error-handler.service';

@Injectable()
export class MethodFreezeAlert {
  constructor(private readonly errorHandler: CustomErrorHandler) {}

  startMonitoring(
    methodClassName: string,
    methodName: string,
    methodArgs?: string,
  ) {
    const timerId = setTimeout(() => {
      this.errorHandler.logAndNotifyInTg(
        `Froze and didn't complete within 5 min`,
        this.constructor.name,
        `[${methodClassName}] [${methodName}]`,
        methodArgs,
      );
    }, 300000); // 5 minutes

    return timerId;
  }

  stopMonitoring(timerId: NodeJS.Timeout) {
    clearTimeout(timerId);
  }
}
