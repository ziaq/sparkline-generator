import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';

import { ActualSparkline, actualSparklineSchema } from '../../../models/actual-sparkline.model';
import { Sparkline, sparklineSchema } from '../../../models/sparkline.model';
import { MethodFreezeAlertModule } from '../../shared/method-freeze-alert/method-freeze-alert.module';

import { SparklineStoreCleaner } from './sparkline-store-cleaner.service';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Sparkline.name, schema: sparklineSchema },
      { name: ActualSparkline.name, schema: actualSparklineSchema },
    ]),
    MethodFreezeAlertModule,
  ],
  providers: [SparklineStoreCleaner],
  exports: [SparklineStoreCleaner],
})
export class SparklineStoreCleanerModule {}
