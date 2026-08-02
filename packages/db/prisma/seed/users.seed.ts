import type { PrismaClient } from '../../src/client.js';

export interface SeedUsers {
  adminId: string;
  workerId: string;
  clientId: string;
}

const upsertUser = async (
  prisma: PrismaClient,
  email: string,
  name: string,
  role: string,
  password: string,
): Promise<string> => {
  const user = await prisma.user.upsert({
    where: { email },
    create: { email, name, password, role },
    update: { name, role },
    select: { id: true },
  });
  return user.id;
};

export const seedUsers = async (prisma: PrismaClient): Promise<SeedUsers> => {
  const password = await Bun.password.hash('password123', { algorithm: 'bcrypt', cost: 12 });

  const adminId = await upsertUser(prisma, 'admin@example.com', 'Admin User', 'ADMIN', password);
  const workerId = await upsertUser(prisma, 'worker@example.com', 'Worker User', 'WORKER', password);
  const clientId = await upsertUser(prisma, 'client@example.com', 'Client User', 'CLIENT', password);

  return { adminId, workerId, clientId };
};
