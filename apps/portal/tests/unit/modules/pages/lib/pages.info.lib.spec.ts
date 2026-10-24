import { describe, expect, it } from 'bun:test';
import {
  countPageContentCharacters,
  countPageContentWords,
  toPageInfoMetadata,
} from '@/modules/pages/trust/lib/pages.info.lib';
import type { PageContent, PageSummary } from '@/modules/pages/types/pages.types';

const contentWithParagraphs = (paragraphs: readonly string[]): PageContent => ({
  content: paragraphs.map((text) => ({ content: [{ text, type: 'text' as const }], type: 'paragraph' as const })),
  schemaVersion: 1,
  type: 'doc',
});

const emptyContent: PageContent = { content: [{ content: [], type: 'paragraph' }], schemaVersion: 1, type: 'doc' };

describe('pages.info.lib', () => {
  describe('countPageContentWords', () => {
    it('counts every word across every block, not the blocks themselves', () => {
      expect(countPageContentWords(contentWithParagraphs(['Hello there', 'General Kenobi']))).toBe(4);
    });

    it('counts a page with no writing as holding no words', () => {
      expect(countPageContentWords(emptyContent)).toBe(0);
    });

    it('does not count the empty stretches left by extra spacing', () => {
      expect(countPageContentWords(contentWithParagraphs(['  Hello   world  ']))).toBe(2);
    });

    it('reads a mention by the name it shows, so a mentioned page counts as a word', () => {
      const content: PageContent = {
        content: [
          {
            content: [
              { text: 'See ', type: 'text' },
              { attrs: { label: 'Handbook', pageId: 'page-1', spaceId: 'space-1' }, type: 'mention' },
            ],
            type: 'paragraph',
          },
        ],
        schemaVersion: 1,
        type: 'doc',
      };

      expect(countPageContentWords(content)).toBe(2);
    });
  });

  describe('countPageContentCharacters', () => {
    it('counts the letters actually written, not the blocks that hold them', () => {
      expect(countPageContentCharacters(contentWithParagraphs(['Hello', 'World']))).toBe(10);
    });

    it('counts a page with no writing as holding no characters', () => {
      expect(countPageContentCharacters(emptyContent)).toBe(0);
    });
  });

  describe('toPageInfoMetadata', () => {
    const buildPage = (overrides: Partial<PageSummary> = {}): PageSummary => ({
      canEdit: true,
      content: emptyContent,
      createdAt: new Date('2026-01-01T10:00:00.000Z'),
      createdBy: { id: 'user-a', name: 'Ada Lovelace' },
      id: 'page-1',
      lifecycle: 'ACTIVE',
      order: 0,
      parentId: null,
      propertyValues: null,
      spaceId: 'space-1',
      title: 'Roadmap',
      updatedAt: new Date('2026-01-02T10:00:00.000Z'),
      updatedBy: { id: 'user-b', name: 'Grace Hopper' },
      version: 2,
      ...overrides,
    });

    it('carries the names and moments a page was created and last edited by', () => {
      expect(toPageInfoMetadata(buildPage())).toEqual({
        createdAt: new Date('2026-01-01T10:00:00.000Z'),
        createdByName: 'Ada Lovelace',
        lastEditedAt: new Date('2026-01-02T10:00:00.000Z'),
        lastEditedByName: 'Grace Hopper',
      });
    });

    it('names nobody when the author no longer resolves to a real user', () => {
      expect(toPageInfoMetadata(buildPage({ createdBy: null, updatedBy: null }))).toEqual({
        createdAt: new Date('2026-01-01T10:00:00.000Z'),
        createdByName: null,
        lastEditedAt: new Date('2026-01-02T10:00:00.000Z'),
        lastEditedByName: null,
      });
    });
  });
});
