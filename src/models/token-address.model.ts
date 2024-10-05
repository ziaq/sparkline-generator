import { z } from 'zod';

export type TokenAddress = string;
export const tokenAddressZod = z.string();
