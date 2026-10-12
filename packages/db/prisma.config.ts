import 'dotenv/config';
import { defineConfig as defineOrmConfig } from '@prisma/orm-postgres/config';
import { definePrismaConfig } from 'prisma/config';

export default definePrismaConfig({
  orm: defineOrmConfig({
    contract: 'prisma/**/*.prisma',
    output: 'src/contract',
    db: { connection: process.env.DATABASE_URL ?? '' },
    migrations: { dir: 'migrations' },
  }),
});
