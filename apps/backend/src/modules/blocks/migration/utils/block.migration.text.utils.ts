import { applyUpdate, Doc } from 'yjs';
import { isSameJson } from '../../domain/block.json.domain';
import { BLOCK_MIGRATION_PROBLEM } from '../constants/block.migration.constants';
import type { BlockMigrationProblem, StoredMigrationBlock } from '../types/block.migration.types';

const describeDrift = (block: StoredMigrationBlock, message: string): BlockMigrationProblem => ({
  blockId: block.id,
  kind: BLOCK_MIGRATION_PROBLEM.storedMismatch,
  message,
  pageId: block.pageId,
});

const listRichTextKeys = (block: StoredMigrationBlock): string[] =>
  Object.entries(block.properties)
    .filter(([, value]) => Array.isArray(value))
    .map(([key]) => key);

/** Reads the state back into a document; a state that cannot be applied is as wrong as one that says other text. */
const readStateDocument = (textState: Uint8Array): Doc | null => {
  const document = new Doc();
  try {
    applyUpdate(document, textState);
  } catch {
    return null;
  }
  return document;
};

/** The stored Yjs state must say, for each rich text property, the same text the property holds. */
export const findTextStateDrift = (block: StoredMigrationBlock): BlockMigrationProblem[] => {
  const keys = listRichTextKeys(block);
  if (keys.length === 0) return [];
  if (block.textState === null) return [describeDrift(block, 'The block has rich text and no Yjs state')];
  const document = readStateDocument(block.textState);
  if (document === null) return [describeDrift(block, 'The Yjs state of the block cannot be read')];
  return keys
    .filter((key) => !isSameJson(document.getText(key).toDelta(), block.properties[key]))
    .map((key) => describeDrift(block, `The Yjs state differs from the property ${key}`));
};
