import { describe, expect, it } from 'bun:test';
import { fireEvent, render, screen } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { useRef, useState } from 'react';
import { PagesHeaderEmojiField } from '@/modules/pages/components/pages.header.emoji.field';
import en from '../../../../../messages/en.json';

interface IHarnessProps {
  readonly initialValue?: string;
}

/** A controlled wrapper, since the field itself only ever knows the value it is given. */
const TitleFieldHarness = ({ initialValue = '' }: IHarnessProps) => {
  const [value, setValue] = useState(initialValue);
  const inputRef = useRef<HTMLInputElement | null>(null);

  return (
    <PagesHeaderEmojiField
      ariaLabel="Page title"
      className="title-field"
      disabled={false}
      id="page-title"
      inputRef={inputRef}
      onChange={setValue}
      placeholder="Untitled"
      value={value}
    />
  );
};

const renderTitleField = (initialValue = '') =>
  render(
    <NextIntlClientProvider locale="en" messages={en}>
      <TitleFieldHarness initialValue={initialValue} />
    </NextIntlClientProvider>,
  );

describe('the emoji finder in the page title', () => {
  it('says nothing about emoji until : is followed by letters', () => {
    renderTitleField();
    const field = screen.getByLabelText('Page title');

    fireEvent.change(field, { target: { value: 'Hello :' } });

    expect(screen.queryByRole('listbox')).toBeNull();
  });

  it('opens the listbox once letters follow the colon, and filters as more is typed', () => {
    renderTitleField();
    const field = screen.getByLabelText('Page title');

    fireEvent.change(field, { target: { value: 'Hello :grinning' } });

    expect(screen.getByRole('listbox', { name: en.pages.emoji.candidates })).toBeDefined();
    expect(screen.getAllByRole('option')).toHaveLength(1);
  });

  it('says there is nothing by that name once nothing answers', () => {
    renderTitleField();
    const field = screen.getByLabelText('Page title');

    fireEvent.change(field, { target: { value: ':zzzznotaname' } });

    expect(screen.getByText(en.pages.emoji.none)).toBeDefined();
    expect(screen.queryByRole('listbox')).toBeNull();
  });

  it('writes the emoji at the cursor on Enter, replacing the trigger', () => {
    renderTitleField();
    const field = screen.getByLabelText('Page title') as HTMLInputElement;

    fireEvent.change(field, { target: { value: 'Hoy :grinning' } });
    fireEvent.keyDown(field, { key: 'Enter' });

    expect(field.value).toBe('Hoy 😀');
    expect(screen.queryByRole('listbox')).toBeNull();
  });

  it('closes without writing on Escape', () => {
    renderTitleField();
    const field = screen.getByLabelText('Page title') as HTMLInputElement;

    fireEvent.change(field, { target: { value: 'Hoy :grinning' } });
    fireEvent.keyDown(field, { key: 'Escape' });

    expect(screen.queryByRole('listbox')).toBeNull();
    expect(field.value).toBe('Hoy :grinning');
  });

  it('steps through candidates with the arrow keys before choosing one', () => {
    renderTitleField();
    const field = screen.getByLabelText('Page title') as HTMLInputElement;

    fireEvent.change(field, { target: { value: ':grin' } });
    fireEvent.keyDown(field, { key: 'ArrowDown' });
    fireEvent.keyDown(field, { key: 'Enter' });

    expect(field.value).toBe('😁');
  });

  it('inserts by clicking a candidate too', () => {
    renderTitleField();
    const field = screen.getByLabelText('Page title') as HTMLInputElement;

    fireEvent.change(field, { target: { value: ':grinning' } });
    fireEvent.click(screen.getByRole('option'));

    expect(field.value).toBe('😀');
  });
});

describe('what role the title field carries', () => {
  it('is a plain text field while nothing is offered, findable as one', () => {
    renderTitleField();

    const field = screen.getByRole('textbox', { name: 'Page title' });

    expect(field.hasAttribute('aria-expanded')).toBe(false);
    expect(field.hasAttribute('aria-controls')).toBe(false);
    expect(field.hasAttribute('aria-activedescendant')).toBe(false);
  });

  it('stays a text field once the trigger is typed but nothing answers', () => {
    renderTitleField();
    const field = screen.getByLabelText('Page title');

    fireEvent.change(field, { target: { value: ':zzzznotaname' } });

    expect(screen.getByRole('textbox', { name: 'Page title' })).toBe(field);
    expect(field.hasAttribute('aria-expanded')).toBe(false);
  });

  it('becomes a combobox pointing at its listbox only while the finder is open', () => {
    renderTitleField();
    const field = screen.getByLabelText('Page title') as HTMLInputElement;

    fireEvent.change(field, { target: { value: ':grinning' } });

    const combobox = screen.getByRole('combobox', { name: 'Page title' });
    expect(combobox).toBe(field);
    const listbox = screen.getByRole('listbox', { name: en.pages.emoji.candidates });
    expect(field.getAttribute('aria-controls')).toBe(listbox.id);
    expect(field.getAttribute('aria-activedescendant')).toBe(screen.getByRole('option').id);
    expect(field.getAttribute('aria-expanded')).toBe('true');

    fireEvent.keyDown(field, { key: 'Escape' });

    expect(screen.getByRole('textbox', { name: 'Page title' })).toBe(field);
    expect(field.hasAttribute('aria-expanded')).toBe(false);
  });
});
