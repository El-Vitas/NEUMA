import { Prisma } from '@company-brain/db/generated';
import type { PageIcon } from '@company-brain/shared';

/** Stores only the fields of the icon's own kind. */
export const toPageIconInput = (icon: PageIcon | null): Prisma.InputJsonValue | typeof Prisma.JsonNull => {
  if (icon === null) return Prisma.JsonNull;
  switch (icon.kind) {
    case 'emoji':
      return { kind: icon.kind, value: icon.value };
    case 'image':
      return { assetId: icon.assetId, kind: icon.kind };
    default:
      return { color: icon.color, kind: icon.kind, name: icon.name };
  }
};
