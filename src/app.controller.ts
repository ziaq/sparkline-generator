import { Body, Controller, Post, UsePipes } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { Config } from './config/config';
import { CONFIG } from './config/config.constants';
import {
  UpdateMultipleSparklinesDto,
  updateMultipleSparklinesDtoZod,
} from './models/update-multiple-sparklines.dto.model';
import {
  UpdateSingleSparklineDto,
  updateSingleSparklineDtoZod,
} from './models/update-single-sparkline.dto.model';
import { ZodValidationPipe } from './pipes/zod-validation.pipe';
import { AppService } from './app.service';

@Controller('sparklines')
export class AppController {
  private readonly config: Config;

  constructor(
    configService: ConfigService,
    private readonly appService: AppService,
  ) {
    this.config = configService.get<Config>(CONFIG);
  }

  @Post('update-multiple')
  @UsePipes(new ZodValidationPipe(updateMultipleSparklinesDtoZod))
  updateMultipleSparklines(@Body() dto: UpdateMultipleSparklinesDto) {
    if (this.config.nodeEnv === 'production') {
      this.appService.updateMultipleSparklines(dto.tokenList, dto.listName);
    }
  }

  @Post('update-single')
  @UsePipes(new ZodValidationPipe(updateSingleSparklineDtoZod))
  updateSparkline(@Body() dto: UpdateSingleSparklineDto) {
    if (this.config.nodeEnv === 'production') {
      this.appService.updateSingleSparkline(
        dto.tokenAddress,
        dto.listName,
        dto.isNeedUpdTrending,
      );
    }
  }
}
