import type { JsonValue } from '@neuma/db';
import type { PageIcon } from '@neuma/shared';

/** Stores only the fields of the icon's own kind. */
export const toPageIconInput = (icon: PageIcon | null): JsonValue => {
  if (icon === null) return null;
  switch (icon.kind) {
    case 'emoji':
      return { kind: icon.kind, value: icon.value };
    case 'image':
      return { assetId: icon.assetId, kind: icon.kind };
    default:
      return { color: icon.color, kind: icon.kind, name: icon.name };
  }
};
