import type { NeumaDatabase, NeumaTransaction } from '@neuma/db';

export type NeumaModels = NeumaDatabase['orm']['public'];

export type NeumaSqlTag = NeumaDatabase['raw']['sql'];

export type NeumaTables = NeumaDatabase['sql']['public'];

export type NeumaSqlRunner = Pick<NeumaTransaction, 'execute' | 'query'>;
