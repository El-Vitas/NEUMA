import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';
import { PrismaClient } from '../../src/client.js';
import { seedDemo } from './demo.seed.js';
import { seedUsers } from './users.seed.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '..', '..', '.env') });

const databaseUrl = process.env.DATABASE_URL;
if (databaseUrl === undefined || databaseUrl === '') {
  throw new Error('DATABASE_URL environment variable is not set');
}

const prisma = new PrismaClient({ connectionString: databaseUrl });

const SEED_ROOT_TABLES = ['Workspace', 'User'] as const;
const SEED_UNREFERENCED_TABLES = ['OutboxEvent', 'SearchDocument', 'CollaborationSnapshot', 'FileAsset'] as const;

const clearAllTables = async (): Promise<void> => {
  const tables = [...SEED_ROOT_TABLES, ...SEED_UNREFERENCED_TABLES].map((table) => `"${table}"`).join(', ');
  await prisma.$executeRawUnsafe(`TRUNCATE TABLE ${tables} CASCADE`);
};

try {
  await clearAllTables();
  const users = await seedUsers(prisma);
  await seedDemo(prisma, users);
} catch (error: unknown) {
  const message = error instanceof Error ? error.message : String(error);
  process.stderr.write(`Seed failed: ${message}\n`);
  process.exit(1);
} finally {
  await prisma.$disconnect();
}
