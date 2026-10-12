import { faker } from '@faker-js/faker';
import { USER_ROLE_VALUES, type UserRole } from '@neuma/shared';
import { Factory } from 'fishery';
import type { NeumaModels } from '@/prisma/types/prisma.types';

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

export const createUserFactory = (models: NeumaModels) =>
  Factory.define<UserSeed>(({ onCreate, params }) => {
    onCreate(async (user) => {
      const hashedPassword = await Bun.password.hash(user.password, {
        algorithm: 'bcrypt',
        cost: HASH_ROUNDS,
      });
      return models.User.create({
        email: user.email,
        isActive: user.isActive,
        name: user.name,
        password: hashedPassword,
        role: user.role,
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
