import type postgres from '@prisma/orm-postgres/runtime';
import type { Contract } from '../contract/contract.js';

export type NeumaDatabase = ReturnType<typeof postgres<Contract>>;

export type NeumaTransaction = Parameters<Parameters<NeumaDatabase['transaction']>[0]>[0];
