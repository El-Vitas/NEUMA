import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';
import { PrismaClient } from '../../src/client.js';
import { seedUsers } from './users.seed.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '..', '..', '.env') });

const databaseUrl = process.env.DATABASE_URL;
if (databaseUrl === undefined || databaseUrl === '') {
  throw new Error('DATABASE_URL environment variable is not set');
}

const prisma = new PrismaClient({ connectionString: databaseUrl });

const clearAllTables = async (): Promise<void> => {
  await prisma.$executeRawUnsafe('TRUNCATE TABLE "User" CASCADE');
};

try {
  await clearAllTables();
  await seedUsers(prisma);
} catch (error: unknown) {
  const message = error instanceof Error ? error.message : String(error);
  process.stderr.write(`Seed failed: ${message}\n`);
  process.exit(1);
} finally {
  await prisma.$disconnect();
}
