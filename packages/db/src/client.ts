import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient as PrismaClientBase } from './generated/client.js';

export interface PrismaClientConfig {
  connectionString: string;
}

export class PrismaClient extends PrismaClientBase {
  constructor(config: PrismaClientConfig) {
    const schema = new URL(config.connectionString).searchParams.get('schema') ?? undefined;
    super({
      adapter: new PrismaPg({ connectionString: config.connectionString }, { schema }),
    });
  }
}
