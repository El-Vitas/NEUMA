import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';
import { createNeumaDatabase, type NeumaDatabase } from '../../src/index.js';
import { seedDemo } from './demo.seed.js';
import { seedUsers } from './users.seed.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '..', '..', '.env') });

const databaseUrl = process.env.DATABASE_URL;
if (databaseUrl === undefined || databaseUrl === '') {
  throw new Error('DATABASE_URL environment variable is not set');
}

const database = createNeumaDatabase(databaseUrl);

const clearAllTables = async (client: NeumaDatabase): Promise<void> => {
  await client
    .runtime()
    .execute(
      client.raw
        .sql`TRUNCATE TABLE "Workspace", "User", "OutboxEvent", "SearchDocument", "CollaborationSnapshot", "FileAsset" CASCADE`
        .affectedCount()
        .build(),
    );
};

try {
  await clearAllTables(database);
  const users = await seedUsers(database);
  await seedDemo(database, users);
} catch (error: unknown) {
  const message = error instanceof Error ? error.message : String(error);
  process.stderr.write(`Seed failed: ${message}\n`);
  process.exitCode = 1;
} finally {
  await database.close();
}
