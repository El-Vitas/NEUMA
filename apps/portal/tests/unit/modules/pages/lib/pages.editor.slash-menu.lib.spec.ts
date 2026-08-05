import { describe, expect, it, mock } from 'bun:test';
import {
  getMentionMenuQuery,
  getSlashMenuQuery,
  handleSlashMenuKeyDown,
  resolveEditorTrigger,
} from '@/modules/pages/lib/pages.editor.slash-menu.lib';

describe('getSlashMenuQuery', () => {
  it('extracts the query right after a slash at the start of a line', () => {
    expect(getSlashMenuQuery('/head')).toBe('head');
  });

  it('extracts the query after a slash preceded by whitespace', () => {
    expect(getSlashMenuQuery('Some text /tab')).toBe('tab');
  });

  it('returns null when there is no active slash query', () => {
    expect(getSlashMenuQuery('Some text')).toBeNull();
  });
});

describe('getMentionMenuQuery', () => {
  it('extracts the query right after an @ at the start of a line', () => {
    expect(getMentionMenuQuery('@jo')).toBe('jo');
  });

  it('extracts an empty query for a bare trigger', () => {
    expect(getMentionMenuQuery('@')).toBe('');
  });

  it('extracts the query after an @ preceded by whitespace', () => {
    expect(getMentionMenuQuery('Ping @jo')).toBe('jo');
  });

  it('does not fire mid-word in an email-like string', () => {
    expect(getMentionMenuQuery('Contact me at john@example.com')).toBeNull();
  });

  it('returns null when there is no active mention query', () => {
    expect(getMentionMenuQuery('Just text')).toBeNull();
  });
});

describe('resolveEditorTrigger', () => {
  it('resolves a slash trigger over a mention trigger when both could match', () => {
    expect(resolveEditorTrigger('/head')).toEqual({ kind: 'slash', query: 'head' });
  });

  it('resolves a mention trigger', () => {
    expect(resolveEditorTrigger('@jo')).toEqual({ kind: 'mention', query: 'jo' });
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
    expect(onSelect).toHaveBeenCalledWith(runCommand);
  });
});
