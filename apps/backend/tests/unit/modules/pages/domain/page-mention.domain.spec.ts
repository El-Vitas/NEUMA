import { describe, expect, it } from 'bun:test';
import type { Prisma } from '@neuma/db/generated';
import { REDACTED_MENTION_LABEL } from '@/modules/pages/constants/pages.constants';
import { extractMentionTargetPageIds, redactUnreadableMentions } from '@/modules/pages/domain/page-mention.domain';

const buildMentionNode = (pageId: string, label: string): Prisma.JsonValue => ({
  attrs: { label, pageId, spaceId: 'space-a' },
  type: 'mention',
});

const buildParagraph = (children: readonly Prisma.JsonValue[]): Prisma.JsonValue => ({
  content: [...children],
  type: 'paragraph',
});

const buildTextNode = (text: string): Prisma.JsonValue => ({ text, type: 'text' });

const buildDocument = (children: readonly Prisma.JsonValue[]): Prisma.JsonValue => ({
  content: [...children],
  schemaVersion: 1,
  type: 'doc',
});

const buildNestedMentionDocument = (pageId: string, label: string): Prisma.JsonValue =>
  buildDocument([
    {
      content: [
        {
          content: [buildParagraph([buildMentionNode(pageId, label)])],
          type: 'list_item',
        },
      ],
      type: 'bullet_list',
    },
  ]);

describe('extractMentionTargetPageIds', () => {
  it('deduplicates repeated mention targets', () => {
    const content = buildDocument([
      buildParagraph([buildMentionNode('page-a', 'Page A'), buildMentionNode('page-a', 'Page A')]),
    ]);

    expect(extractMentionTargetPageIds(content)).toEqual(['page-a']);
  });

  it('returns an empty array for content without mentions', () => {
    const content = buildDocument([buildParagraph([buildTextNode('No mentions here')])]);

    expect(extractMentionTargetPageIds(content)).toEqual([]);
  });

  it('returns an empty array for content that fails validation', () => {
    expect(extractMentionTargetPageIds({ not: 'a valid document' })).toEqual([]);
  });
});

describe('redactUnreadableMentions', () => {
  it('keeps the real label when the reader can access the target', () => {
    const content = buildDocument([buildParagraph([buildMentionNode('page-a', 'Roadmap 2026')])]);

    const redacted = redactUnreadableMentions(content, new Set(['page-a']), REDACTED_MENTION_LABEL);

    expect(redacted).toEqual(buildDocument([buildParagraph([buildMentionNode('page-a', 'Roadmap 2026')])]));
  });

  it('replaces the label with the placeholder when the reader cannot access the target', () => {
    const content = buildDocument([buildParagraph([buildMentionNode('page-a', 'Confidential Salary Review')])]);

    const redacted = redactUnreadableMentions(content, new Set(), REDACTED_MENTION_LABEL);

    expect(JSON.stringify(redacted)).not.toContain('Confidential Salary Review');
    expect(redacted).toEqual(buildDocument([buildParagraph([buildMentionNode('page-a', REDACTED_MENTION_LABEL)])]));
  });

  it('redacts a mention nested inside a list without disturbing sibling structure', () => {
    const content = buildNestedMentionDocument('page-a', 'Nested Secret');

    const redacted = redactUnreadableMentions(content, new Set(), REDACTED_MENTION_LABEL);

    expect(redacted).toEqual(buildNestedMentionDocument('page-a', REDACTED_MENTION_LABEL));
  });

  it('redacts only the unreadable mention when one of two targets is readable', () => {
    const content = buildDocument([
      buildParagraph([buildMentionNode('page-readable', 'Readable Page')]),
      buildParagraph([buildMentionNode('page-hidden', 'Hidden Page')]),
    ]);

    const redacted = redactUnreadableMentions(content, new Set(['page-readable']), REDACTED_MENTION_LABEL);

    expect(redacted).toEqual(
      buildDocument([
        buildParagraph([buildMentionNode('page-readable', 'Readable Page')]),
        buildParagraph([buildMentionNode('page-hidden', REDACTED_MENTION_LABEL)]),
      ]),
    );
  });

  it('treats a target absent from the readable set the same as any other unreadable target', () => {
    const content = buildDocument([buildParagraph([buildMentionNode('page-deleted', 'Deleted Page Title')])]);

    const redacted = redactUnreadableMentions(content, new Set(['some-other-page']), REDACTED_MENTION_LABEL);

    expect(redacted).toEqual(
      buildDocument([buildParagraph([buildMentionNode('page-deleted', REDACTED_MENTION_LABEL)])]),
    );
  });

  it('does not mutate the original content object', () => {
    const content = buildDocument([buildParagraph([buildMentionNode('page-a', 'Original Title')])]);

    redactUnreadableMentions(content, new Set(), REDACTED_MENTION_LABEL);

    expect(content).toEqual(buildDocument([buildParagraph([buildMentionNode('page-a', 'Original Title')])]));
  });
});
