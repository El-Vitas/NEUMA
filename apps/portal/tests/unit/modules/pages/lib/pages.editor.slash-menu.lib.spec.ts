import { describe, expect, it, mock } from 'bun:test';
import { PAGE_EDITOR_MENTION_CREATION_ITEM_ID } from '@/modules/pages/editor/blocks/constants/pages.editor.blocks.constants';
import { pageEditorSchema } from '@/modules/pages/editor/lib/pages.editor.schema';
import {
  buildEditorTriggerItems,
  buildSlashMenuOptionId,
  describeEditorWithTriggerMenu,
  getEmojiMenuQuery,
  getMentionMenuQuery,
  getSlashMenuQuery,
  handleSlashMenuKeyDown,
  resolveEditorTrigger,
} from '@/modules/pages/editor/menus/lib/pages.editor.slash-menu.lib';
import type { PageEditorDayOffer } from '@/modules/pages/editor/text/types/pages.editor.date.types';

describe('getSlashMenuQuery', () => {
  it('extracts the query right after a slash at the very start of the block', () => {
    expect(getSlashMenuQuery('/head')).toBe('head');
  });

  it('fires mid sentence when the slash follows a space', () => {
    expect(getSlashMenuQuery('Some text /tab')).toBe('tab');
  });

  it('extracts an empty query for a bare trigger', () => {
    expect(getSlashMenuQuery('/')).toBe('');
  });

  it('does not fire inside a path, where the slash is glued to a word', () => {
    expect(getSlashMenuQuery('src/lib')).toBeNull();
    expect(getSlashMenuQuery('run /usr/bin')).toBeNull();
  });

  it('does not fire inside a date', () => {
    expect(getSlashMenuQuery('2026/08/11')).toBeNull();
  });

  it('returns null when there is no active slash query', () => {
    expect(getSlashMenuQuery('Some text')).toBeNull();
  });
});

describe('getMentionMenuQuery', () => {
  it('extracts the query right after an @ at the start of the block', () => {
    expect(getMentionMenuQuery('@jo')).toBe('jo');
  });

  it('extracts an empty query for a bare trigger', () => {
    expect(getMentionMenuQuery('@')).toBe('');
  });

  it('extracts the query after an @ preceded by whitespace, mid-sentence', () => {
    expect(getMentionMenuQuery('Ping @jo')).toBe('jo');
  });

  it('does not fire mid-word in an email-like string', () => {
    expect(getMentionMenuQuery('Contact me at john@example.com')).toBeNull();
  });

  it('returns null when there is no active mention query', () => {
    expect(getMentionMenuQuery('Just text')).toBeNull();
  });
});

describe('getEmojiMenuQuery', () => {
  it('extracts the query right after a colon at the start of the block', () => {
    expect(getEmojiMenuQuery(':heart')).toBe('heart');
  });

  it('does not fire on a bare trigger: a colon on its own is punctuation', () => {
    expect(getEmojiMenuQuery(':')).toBeNull();
  });

  it('does not fire while the colon is followed only by whitespace', () => {
    expect(getEmojiMenuQuery('Nice : ')).toBeNull();
  });

  it('extracts the query after a colon preceded by whitespace, mid-sentence', () => {
    expect(getEmojiMenuQuery('Nice :fire')).toBe('fire');
  });

  it('does not fire inside a url, where the colon is glued to a word', () => {
    expect(getEmojiMenuQuery('http://x')).toBeNull();
  });

  it('does not fire inside a time', () => {
    expect(getEmojiMenuQuery('12:30')).toBeNull();
  });

  it('returns null when there is no active emoji query', () => {
    expect(getEmojiMenuQuery('Just text')).toBeNull();
  });

  it('accepts accented letters and ñ, since the names it answers to are written in Spanish', () => {
    expect(getEmojiMenuQuery(':guiño')).toBe('guiño');
    expect(getEmojiMenuQuery(':cumpleaños')).toBe('cumpleaños');
  });
});

describe('resolveEditorTrigger', () => {
  it('resolves a slash trigger over a mention trigger when both could match', () => {
    expect(resolveEditorTrigger('/head')).toEqual({ kind: 'slash', query: 'head' });
  });

  it('resolves a mention trigger', () => {
    expect(resolveEditorTrigger('@jo')).toEqual({ kind: 'mention', query: 'jo' });
  });

  it('resolves an emoji trigger', () => {
    expect(resolveEditorTrigger(':heart')).toEqual({ kind: 'emoji', query: 'heart' });
  });

  it('does not resolve an emoji trigger glued to a word, as in a url or a time', () => {
    expect(resolveEditorTrigger('http://x')).toBeNull();
    expect(resolveEditorTrigger('12:30')).toBeNull();
  });

  it('does not resolve a bare colon: a colon on its own is punctuation, not a trigger', () => {
    expect(resolveEditorTrigger(':')).toBeNull();
    expect(resolveEditorTrigger('Just wrote :')).toBeNull();
  });

  it('returns null when neither trigger is active', () => {
    expect(resolveEditorTrigger('Just text')).toBeNull();
  });
});

describe('handleSlashMenuKeyDown', () => {
  const runCommand = mock(() => true);

  it('closes the menu on Escape without selecting an item', () => {
    const onClose = mock(() => undefined);
    const onSelect = mock(() => undefined);
    const event = new KeyboardEvent('keydown', { cancelable: true, key: 'Escape' });

    const handled = handleSlashMenuKeyDown({
      event,
      items: [{ id: 'a', label: 'A', run: runCommand }],
      onClose,
      onSelect,
      onSelectedIndexChange: () => undefined,
      selectedIndex: 0,
    });

    expect(handled).toBe(true);
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(onSelect).not.toHaveBeenCalled();
  });

  it('runs the selected item on Enter', () => {
    const onSelect = mock(() => undefined);
    const event = new KeyboardEvent('keydown', { cancelable: true, key: 'Enter' });

    const handled = handleSlashMenuKeyDown({
      event,
      items: [{ id: 'a', label: 'A', run: runCommand }],
      onClose: () => undefined,
      onSelect,
      onSelectedIndexChange: () => undefined,
      selectedIndex: 0,
    });

    expect(handled).toBe(true);
    expect(onSelect).toHaveBeenCalledWith({ id: 'a', label: 'A', run: runCommand });
  });

  describe('describeEditorWithTriggerMenu', () => {
    it('points the editor at the option marked in the menu it controls', () => {
      const described = describeEditorWithTriggerMenu('menu-1', 'heading');

      expect(described).toEqual({
        'aria-activedescendant': buildSlashMenuOptionId('menu-1', 'heading'),
        'aria-controls': 'menu-1',
        'aria-expanded': 'true',
        role: 'combobox',
      });
    });

    it('says nothing at all when no option is marked, so a closed menu leaves the editor as plain text', () => {
      expect(describeEditorWithTriggerMenu('menu-1', null)).toEqual({});
    });
  });
});

describe('buildEditorTriggerItems, mention kind', () => {
  const dayOffers: readonly PageEditorDayOffer[] = [
    { at: '2026-08-15', id: 'today', labelKey: 'today' },
    { at: '2026-08-16', id: 'tomorrow', labelKey: 'tomorrow' },
    { at: '2026-08-14', id: 'yesterday', labelKey: 'yesterday' },
    { at: '2026-08-15', id: 'pick', labelKey: 'pick' },
  ];
  const dayLabelsByKey: Readonly<Record<PageEditorDayOffer['labelKey'], string>> = {
    pick: 'Pick another day',
    today: 'Today',
    tomorrow: 'Tomorrow',
    yesterday: 'Yesterday',
  };
  const translateDayLabel = (labelKey: PageEditorDayOffer['labelKey']) => dayLabelsByKey[labelKey];

  it('offers pages and people together, closest to what was typed first', () => {
    const items = buildEditorTriggerItems({
      canMakeAPage: true,
      commands: {},
      dayOffers: [],
      mentionCandidates: [{ id: 'page-1', label: 'Ana Standup Notes', spaceId: 'space-1' }],
      nameTheOfferToMakeAPage: (title) => `Create "${title}"`,
      personCandidates: [{ email: 'ana@example.com', id: 'user-1', name: 'Ana' }],
      schema: pageEditorSchema,
      translateCommandLabel: (labelKey) => labelKey,
      translateDayLabel,
      triggerKind: 'mention',
      triggerQuery: 'ana',
    });

    expect(items[0]?.id).toBe('person-user-1');
    expect(items.map((item) => item.id)).toContain('page-1');
  });

  it('is told apart from a page candidate only by the mark it carries once written, so both share the same shape here', () => {
    const items = buildEditorTriggerItems({
      canMakeAPage: false,
      commands: {},
      dayOffers: [],
      mentionCandidates: [],
      nameTheOfferToMakeAPage: (title) => title,
      personCandidates: [{ email: 'ana@example.com', id: 'user-1', name: 'Ana' }],
      schema: pageEditorSchema,
      translateCommandLabel: (labelKey) => labelKey,
      translateDayLabel,
      triggerKind: 'mention',
      triggerQuery: null,
    });

    expect(items).toEqual([{ id: 'person-user-1', label: 'Ana', run: items[0]?.run }]);
  });

  it('offers the four days under their own translated names, filtered by what was typed', () => {
    const items = buildEditorTriggerItems({
      canMakeAPage: false,
      commands: {},
      dayOffers,
      mentionCandidates: [],
      nameTheOfferToMakeAPage: (title) => title,
      personCandidates: [],
      schema: pageEditorSchema,
      translateCommandLabel: (labelKey) => labelKey,
      translateDayLabel,
      triggerKind: 'mention',
      triggerQuery: 'tod',
    });

    expect(items.map((item) => item.label)).toEqual(['Today']);
    expect(items[0]?.id).toBe('date-today');
  });

  it('offers the make-a-page offer last, after every page, person and day that matched', () => {
    const items = buildEditorTriggerItems({
      canMakeAPage: true,
      commands: {},
      dayOffers: [],
      mentionCandidates: [],
      nameTheOfferToMakeAPage: (title) => `Create "${title}"`,
      personCandidates: [],
      schema: pageEditorSchema,
      translateCommandLabel: (labelKey) => labelKey,
      translateDayLabel,
      triggerKind: 'mention',
      triggerQuery: 'roadmap',
    });

    expect(items).toEqual([
      { id: PAGE_EDITOR_MENTION_CREATION_ITEM_ID, label: 'Create "roadmap"', run: items[0]?.run },
    ]);
  });
});
