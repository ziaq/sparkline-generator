import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { z } from 'zod';

// Update both Mongoose and ZOD schemas simultaneously as they share the same structure

// MONGOOSE SCHEMA
@Schema({ collection: 'actual_sparklines' })
export class ActualSparkline {
  @Prop({ required: true })
  tokenAddress: string;

  @Prop({ required: true })
  fileName: string;
}
export const actualSparklineSchema =
  SchemaFactory.createForClass(ActualSparkline);

// ZOD SCHEMA
export const actualSparklineZod = z.object({
  tokenAddress: z.string(),
  fileName: z.string(),
});
