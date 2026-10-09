import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { Client } from 'pg';

const MIGRATION = '20261004120000_agent_action_request_id';
const UNIQUE_INDEX_PATTERN = /CREATE UNIQUE INDEX "AgentAction_tokenId_requestId_live_key"[\s\S]*?;/;

/** Partial unique index that `db push` cannot create, so it is taken verbatim from its migration. */
export const applyAgentActionRequestIndex = async (schemaScopedDatabaseUrl: string): Promise<void> => {
  const path = resolve(process.cwd(), `../../packages/db/prisma/migrations/${MIGRATION}/migration.sql`);
  const statement = UNIQUE_INDEX_PATTERN.exec(readFileSync(path, 'utf8'))?.[0];
  if (statement === undefined)
    throw new Error(
      `Could not find the request id index in ${path}. The migration was restructured — update ` +
        'tests/helpers/agent-action-request.fixture.ts to match its new shape.',
    );
  const client = new Client({ connectionString: schemaScopedDatabaseUrl });
  await client.connect();
  try {
    await client.query(statement);
  } finally {
    await client.end();
  }
};
