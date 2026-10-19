import { faker } from '@faker-js/faker';
import type { BlockRole } from '@neuma/shared';
import { Factory } from 'fishery';
import type { NeumaModels } from '@/prisma/types/prisma.types';

type PermissionPrincipalSeed = { kind: 'space' } | { kind: 'user'; userId: string };

type PermissionEntrySeed = { principal: PermissionPrincipalSeed; role: BlockRole };

interface BlockSeed {
  alive: boolean;
  children: string[];
  createdById: string;
  editedById: string;
  id: string;
  parentId: string | null;
  permissions: PermissionEntrySeed[] | null;
  spaceId: string;
  text: string;
  title: string;
  type: string;
  version: number;
}

/** `spaceId` and the author ids have no sensible default: pass them as params. */
export const createBlockFactory = (models: NeumaModels) =>
  Factory.define<BlockSeed>(({ onCreate, params }) => {
    onCreate(async (block) => {
      await models.Block.create({
        alive: block.alive,
        children: block.children,
        createdById: block.createdById,
        editedById: block.editedById,
        id: block.id,
        parentId: block.parentId,
        permissions: block.permissions,
        properties: { title: block.title },
        spaceId: block.spaceId,
        text: block.text,
        type: block.type,
        version: block.version,
      });
      return block;
    });

    return {
      alive: true,
      children: [],
      createdById: '',
      editedById: '',
      id: faker.string.uuid(),
      parentId: null,
      permissions: null,
      spaceId: '',
      text: faker.lorem.words(3),
      title: faker.lorem.words(2),
      type: 'paragraph',
      version: 1,
      ...params,
    };
  });
