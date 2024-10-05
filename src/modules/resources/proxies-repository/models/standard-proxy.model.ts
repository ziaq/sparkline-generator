import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { z } from 'zod';

// Update both Mongoose and ZOD schemas simultaneously as they share the same structure

// MONGOOSE SCHEMA
@Schema({ collection: 'standard_proxies' })
export class StandardProxy {
  @Prop({ required: true })
  host: string;

  @Prop({ required: true })
  port: string;

  @Prop({ required: true })
  username: string;

  @Prop({ required: true })
  password: string;
}
export const standardProxySchema = SchemaFactory.createForClass(StandardProxy);

// ZOD SCHEMA
export const standardProxyZod = z.object({
  host: z.string(),
  port: z.string(),
  username: z.string(),
  password: z.string(),
});
export const standardProxiesZod = z.array(standardProxyZod);
