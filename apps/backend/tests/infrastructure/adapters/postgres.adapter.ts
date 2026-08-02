import { Client } from 'pg';

export class PostgresAdapter {
  private readonly client: Client;

  constructor(connectionString: string) {
    this.client = new Client({ connectionString });
  }

  async connect(): Promise<void> {
    await this.client.connect();
  }

  async end(): Promise<void> {
    await this.client.end();
  }

  async query(sql: string): Promise<void> {
    await this.client.query(sql);
  }
}
