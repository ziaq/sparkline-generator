import { plainToInstance } from 'class-transformer';
import { IsNotEmpty, validateSync } from 'class-validator';

class EnvVars {
  // Just make sure .env exists
  @IsNotEmpty()
  MICROSERVICE_NAME: string;
}

export function validate(config: Record<string, unknown>) {
  const transformedEnvVars = plainToInstance(EnvVars, config, {
    enableImplicitConversion: true,
  });

  const errors = validateSync(transformedEnvVars, {
    skipMissingProperties: false,
  });

  if (errors.length > 0) {
    throw new Error('Environment variables are not set');
  }

  return transformedEnvVars;
}
