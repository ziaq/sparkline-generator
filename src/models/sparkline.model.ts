import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { z } from 'zod';

import { TokenAddress, tokenAddressZod } from './token-address.model';

// Update both Mongoose and ZOD schemas simultaneously as they share the same structure

// MONGOOSE SCHEMA
@Schema()
export class Sparkline {
  @Prop({ required: true })
  tokenAddress: TokenAddress;

  @Prop({ required: true })
  fileName: string;

  @Prop({ required: true })
  date: Date;

  @Prop({ required: true })
  priceChangePeriod: string;

  @Prop({ required: true })
  priceChange: string;

  @Prop({ required: true, enum: [5, 15] })
  timeframe: number;
}
export const sparklineSchema = SchemaFactory.createForClass(Sparkline);

// ZOD SCHEMA
export const sparklineZod = z.object({
  tokenAddress: tokenAddressZod,
  fileName: z.string(),
  date: z.string().datetime(),
  priceChangePeriod: z.string(),
  priceChange: z.string(),
  timeframe: z.union([z.literal(5), z.literal(15)]),
});
