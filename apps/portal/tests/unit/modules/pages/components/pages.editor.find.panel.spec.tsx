import { describe, expect, it, mock } from 'bun:test';
import { fireEvent, render, screen } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { PagesEditorFindPanel } from '@/modules/pages/components/pages.editor.find.panel';
import en from '../../../../../messages/en.json';

interface IPanelOverrides {
  readonly currentIndex?: number | null;
  readonly onClose?: () => void;
  readonly onNext?: () => void;
  readonly onPrevious?: () => void;
  readonly onQueryChange?: (query: string) => void;
  readonly onReplace?: () => void;
  readonly onReplaceAll?: () => void;
  readonly onReplacementChange?: (replacement: string) => void;
  readonly query?: string;
  readonly replacement?: string;
  readonly totalMatches?: number;
}

const renderPanel = (overrides: IPanelOverrides = {}) =>
  render(
    <NextIntlClientProvider locale="en" messages={en}>
      <PagesEditorFindPanel
        currentIndex={overrides.currentIndex ?? null}
        onClose={overrides.onClose ?? (() => undefined)}
        onNext={overrides.onNext ?? (() => undefined)}
        onPrevious={overrides.onPrevious ?? (() => undefined)}
        onQueryChange={overrides.onQueryChange ?? (() => undefined)}
        onReplace={overrides.onReplace ?? (() => undefined)}
        onReplaceAll={overrides.onReplaceAll ?? (() => undefined)}
        onReplacementChange={overrides.onReplacementChange ?? (() => undefined)}
        query={overrides.query ?? ''}
        replacement={overrides.replacement ?? ''}
        totalMatches={overrides.totalMatches ?? 0}
      />
    </NextIntlClientProvider>,
  );

describe('what the search panel offers', () => {
  it('names its own field and the field that replaces', () => {
    renderPanel();

    expect(screen.getByLabelText(en.pages.find.field)).toBeDefined();
    expect(screen.getByLabelText(en.pages.find.replaceField)).toBeDefined();
  });

  it('gives the search field the focus the moment it opens', () => {
    renderPanel();

    expect(document.activeElement).toBe(screen.getByLabelText(en.pages.find.field));
  });

  it('says nothing about matches before anything was typed', () => {
    renderPanel({ query: '' });

    expect(screen.queryByText(en.pages.find.noMatches)).toBeNull();
  });

  it('says how many matches there are, and which one is current', () => {
    renderPanel({ currentIndex: 1, query: 'foo', totalMatches: 3 });

    expect(screen.getByText('2 of 3')).toBeDefined();
  });

  it('says there are no matches once something was typed and nothing was found', () => {
    renderPanel({ query: 'foo', totalMatches: 0 });

    expect(screen.getByText(en.pages.find.noMatches)).toBeDefined();
  });

  it('keeps stepping and replacing out of reach while nothing was found', () => {
    renderPanel({ query: 'foo', totalMatches: 0 });

    expect(screen.getByLabelText(en.pages.find.next).hasAttribute('disabled')).toBe(true);
    expect(screen.getByLabelText(en.pages.find.previous).hasAttribute('disabled')).toBe(true);
    expect(screen.getByText(en.pages.find.replace).hasAttribute('disabled')).toBe(true);
    expect(screen.getByText(en.pages.find.replaceAll).hasAttribute('disabled')).toBe(true);
  });
});

describe('what typing and clicking in the panel does', () => {
  it('tells about every keystroke in the search field', () => {
    const onQueryChange = mock();
    renderPanel({ onQueryChange });

    fireEvent.change(screen.getByLabelText(en.pages.find.field), { target: { value: 'algo' } });

    expect(onQueryChange).toHaveBeenCalledWith('algo');
  });

  it('steps forward on Enter, and back on Shift+Enter', () => {
    const onNext = mock();
    const onPrevious = mock();
    renderPanel({ onNext, onPrevious, query: 'foo', totalMatches: 2 });
    const field = screen.getByLabelText(en.pages.find.field);

    fireEvent.keyDown(field, { key: 'Enter' });
    expect(onNext).toHaveBeenCalledTimes(1);

    fireEvent.keyDown(field, { key: 'Enter', shiftKey: true });
    expect(onPrevious).toHaveBeenCalledTimes(1);
  });

  it('closes on Escape from the search field', () => {
    const onClose = mock();
    renderPanel({ onClose });

    fireEvent.keyDown(screen.getByLabelText(en.pages.find.field), { key: 'Escape' });

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('closes on Escape from the replace field too', () => {
    const onClose = mock();
    renderPanel({ onClose });

    fireEvent.keyDown(screen.getByLabelText(en.pages.find.replaceField), { key: 'Escape' });

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('goes to the next and the previous match by the buttons', () => {
    const onNext = mock();
    const onPrevious = mock();
    renderPanel({ onNext, onPrevious, query: 'foo', totalMatches: 2 });

    fireEvent.click(screen.getByLabelText(en.pages.find.next));
    fireEvent.click(screen.getByLabelText(en.pages.find.previous));

    expect(onNext).toHaveBeenCalledTimes(1);
    expect(onPrevious).toHaveBeenCalledTimes(1);
  });

  it('closes on the close button', () => {
    const onClose = mock();
    renderPanel({ onClose });

    fireEvent.click(screen.getByLabelText(en.pages.find.close));

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('tells about every keystroke in the replace field, and replaces on Enter', () => {
    const onReplace = mock();
    const onReplacementChange = mock();
    renderPanel({ onReplace, onReplacementChange, query: 'foo', totalMatches: 1 });
    const field = screen.getByLabelText(en.pages.find.replaceField);

    fireEvent.change(field, { target: { value: 'bar' } });
    fireEvent.keyDown(field, { key: 'Enter' });

    expect(onReplacementChange).toHaveBeenCalledWith('bar');
    expect(onReplace).toHaveBeenCalledTimes(1);
  });

  it('replaces one or replaces all by their own buttons', () => {
    const onReplace = mock();
    const onReplaceAll = mock();
    renderPanel({ onReplace, onReplaceAll, query: 'foo', totalMatches: 2 });

    fireEvent.click(screen.getByText(en.pages.find.replace));
    fireEvent.click(screen.getByText(en.pages.find.replaceAll));

    expect(onReplace).toHaveBeenCalledTimes(1);
    expect(onReplaceAll).toHaveBeenCalledTimes(1);
  });
});
