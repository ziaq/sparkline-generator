export interface RedisParams {
  redisNodeName: 'main' | 'secondary';
  dbNum: number;
  providerToken: string;
}

export interface RedisSettings {
  host: string;
  port: number;
  password: string;
}
