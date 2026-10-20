import { type BlockViewer, canReadBlock, resolveBlockRole } from '@neuma/shared';
import type { DeclaringAncestor, HeadingEntry } from './search.domain.types';

/**
 * A block is readable when every ancestor that declares permissions lets the viewer read, so a branch the viewer is
 * cut off from stays hidden even where a deeper block grants them access. The space itself was checked in SQL.
 */
export const canReadCandidate = (viewer: BlockViewer, chain: readonly DeclaringAncestor[]): boolean =>
  chain.every((ancestor) => canReadBlock(resolveBlockRole({ canReadSpace: true, chain: [ancestor], viewer })));

const nestUnder = (outline: readonly HeadingEntry[], heading: HeadingEntry): HeadingEntry[] => [
  ...outline.filter((enclosing) => enclosing.level < heading.level),
  heading,
];

/** From the headings that come before a block among its siblings, in order, the ones that enclose it. */
export const buildHeadingPath = (headings: readonly HeadingEntry[]): string[] =>
  headings.reduce<HeadingEntry[]>(nestUnder, []).map((heading) => heading.text);
