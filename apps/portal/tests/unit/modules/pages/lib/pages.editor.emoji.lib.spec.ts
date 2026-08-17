import { describe, expect, it } from 'bun:test';
import type { PageContent } from '@company-brain/shared';
import {
  PAGE_EDITOR_EMOJI_MENU_LIMIT,
  PAGE_EDITOR_EMOJI_TRIGGER,
} from '@/modules/pages/constants/pages.editor.emoji.constants';
import {
  askForEmoji,
  buildEmojiTriggerItems,
  createEmojiInsertCommand,
  findEmojiCandidates,
} from '@/modules/pages/lib/pages.editor.emoji.lib';
import { createPageEditorState, serializePageEditorState } from '@/modules/pages/lib/pages.editor.lib';

const emptyPage: PageContent = {
  content: [{ content: [], type: 'paragraph' }],
  schemaVersion: 1,
  type: 'doc',
};

describe('findEmojiCandidates', () => {
  it('finds an emoji by its English name', () => {
    const found = findEmojiCandidates('heart');

    expect(found.some((entry) => entry.character === '❤️')).toBe(true);
  });

  it('finds the same emoji by its Spanish name, accents and capitals set aside', () => {
    const found = findEmojiCandidates('CORAZÓN');

    expect(found.some((entry) => entry.character === '❤️')).toBe(true);
  });

  it('never hands back more than the menu limit', () => {
    const found = findEmojiCandidates('');

    expect(found.length).toBeLessThanOrEqual(PAGE_EDITOR_EMOJI_MENU_LIMIT);
    expect(found.length).toBeGreaterThan(0);
  });

  it('finds nothing for a name no emoji goes by', () => {
    expect(findEmojiCandidates('xyzxyzxyz')).toEqual([]);
  });

  it('finds a name written with an accent when the typing carries the same accent', () => {
    const found = findEmojiCandidates('guiño');

    expect(found.some((entry) => entry.character === '😉')).toBe(true);
    expect(found.some((entry) => entry.character === '😜')).toBe(true);
  });

  it('finds the same accented name when the typing has no accent', () => {
    const found = findEmojiCandidates('guino');

    expect(found.some((entry) => entry.character === '😉')).toBe(true);
    expect(found.some((entry) => entry.character === '😜')).toBe(true);
  });

  it('finds a name carrying ñ, accent set aside', () => {
    const found = findEmojiCandidates('cumpleaños');

    expect(found.some((entry) => entry.character === '🎂')).toBe(true);
  });
});

describe('buildEmojiTriggerItems', () => {
  it('shows the emoji itself beside its name', () => {
    const items = buildEmojiTriggerItems('heart');
    const heartItem = items.find((item) => item.id === '❤️');

    expect(heartItem?.label.startsWith('❤️')).toBe(true);
  });
});

describe('createEmojiInsertCommand', () => {
  it('writes the emoji as plain text where the cursor stands', () => {
    const state = createPageEditorState(emptyPage, 'Select', 'Insert');
    const insert = createEmojiInsertCommand('❤️');
    let kept: PageContent | null = null;

    const ran = insert(state, (transaction) => {
      kept = serializePageEditorState(state.apply(transaction));
    });

    expect(ran).toBe(true);
    expect(JSON.stringify(kept)).toContain('❤️');
    expect(JSON.stringify(kept)).not.toContain('"type":"mention"');
  });
});

describe('askForEmoji', () => {
  it('writes the trigger so the finder that already answers it opens', () => {
    const state = createPageEditorState(emptyPage, 'Select', 'Insert');
    let kept: PageContent | null = null;

    const ran = askForEmoji(state, (transaction) => {
      kept = serializePageEditorState(state.apply(transaction));
    });

    expect(ran).toBe(true);
    expect(JSON.stringify(kept)).toContain(PAGE_EDITOR_EMOJI_TRIGGER);
  });
});
