import { Module } from '@nestjs/common';

import { MethodFreezeAlert } from './method-freeze-alert.service';

@Module({
  providers: [MethodFreezeAlert],
  exports: [MethodFreezeAlert],
})
export class MethodFreezeAlertModule {}
