import postgres from '@prisma/orm-postgres/runtime';
import type { Contract } from './contract/contract.js';
import contractJson from './contract/contract.json' with { type: 'json' };
import type { NeumaDatabase } from './types/database.types.js';

/** One per process: it owns the connection pool, so close it on shutdown. */
export const createNeumaDatabase = (url: string): NeumaDatabase => postgres<Contract>({ contractJson, url });
