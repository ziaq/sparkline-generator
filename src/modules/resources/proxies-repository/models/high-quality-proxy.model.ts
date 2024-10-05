import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { z } from 'zod';

import { StandardProxy, standardProxyZod } from './standard-proxy.model';

// Update both Mongoose and ZOD schemas simultaneously as they share the same structure

// MONGOOSE SCHEMA
@Schema({ collection: 'high_quality_proxies' })
export class HighQualityProxy extends StandardProxy {
  @Prop({ required: true })
  refreshIpLink: string;
}
export const highQualityProxySchema =
  SchemaFactory.createForClass(HighQualityProxy);

// ZOD SCHEMA
const highQualityProxyZod = standardProxyZod.extend({
  refreshIpLink: z.string(),
});
export const highQualityProxiesZod = z.array(highQualityProxyZod);
