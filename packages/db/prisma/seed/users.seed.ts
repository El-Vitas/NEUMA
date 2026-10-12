import type { NeumaDatabase, UserRole } from '../../src/index.js';

export interface SeedUsers {
  adminId: string;
  workerId: string;
  clientId: string;
}

const upsertUser = async (
  database: NeumaDatabase,
  email: string,
  name: string,
  role: UserRole,
  password: string,
): Promise<string> => {
  const users = database.orm.public.User;
  const updatedUser = await users.where({ email }).update({ name, role });
  if (updatedUser !== null) return updatedUser.id;
  const createdUser = await users.create({ email, name, password, role });
  return createdUser.id;
};

export const seedUsers = async (database: NeumaDatabase): Promise<SeedUsers> => {
  const password = await Bun.password.hash('password123', { algorithm: 'bcrypt', cost: 12 });

  const adminId = await upsertUser(database, 'admin@example.com', 'Admin User', 'ADMIN', password);
  const workerId = await upsertUser(database, 'worker@example.com', 'Worker User', 'WORKER', password);
  const clientId = await upsertUser(database, 'client@example.com', 'Client User', 'CLIENT', password);

  return { adminId, workerId, clientId };
};
