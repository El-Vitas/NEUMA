import type { PrismaClient } from '@company-brain/db/generated';
import { USER_ROLE_VALUES, type UserRole } from '@company-brain/shared';
import { faker } from '@faker-js/faker';
import { Factory } from 'fishery';

const HASH_ROUNDS = 4;

interface UserSeed {
  createdAt: Date;
  email: string;
  id: string;
  isActive: boolean;
  name: string;
  password: string;
  role: UserRole;
  updatedAt: Date;
}

export const createUserFactory = (prisma: PrismaClient) =>
  Factory.define<UserSeed>(({ onCreate, params }) => {
    onCreate(async (user) => {
      const hashedPassword = await Bun.password.hash(user.password, {
        algorithm: 'bcrypt',
        cost: HASH_ROUNDS,
      });
      return prisma.user.create({
        data: {
          email: user.email,
          isActive: user.isActive,
          name: user.name,
          password: hashedPassword,
          role: user.role,
        },
      });
    });

    return {
      createdAt: new Date(),
      email: faker.internet.email().toLowerCase(),
      id: faker.string.uuid(),
      isActive: true,
      name: faker.person.fullName(),
      password: 'plainPassword123',
      role: faker.helpers.arrayElement(USER_ROLE_VALUES),
      updatedAt: new Date(),
      ...params,
    };
  });
