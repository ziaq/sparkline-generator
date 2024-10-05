import { Schema, SchemaFactory } from '@nestjs/mongoose';

import { HighQualityProxy } from './high-quality-proxy.model';

@Schema({ collection: 'high_quality_proxies_fallback' })
export class HighQualityProxyFallback extends HighQualityProxy {}

export const highQualityProxyFallbackSchema = SchemaFactory.createForClass(
  HighQualityProxyFallback,
);
