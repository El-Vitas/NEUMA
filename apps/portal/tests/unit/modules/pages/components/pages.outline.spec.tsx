import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { fireEvent, render, screen } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { PagesOutline } from '@/modules/pages/components/pages.outline';
import { PAGE_OUTLINE_VISIBILITY_STORAGE_KEY } from '@/modules/pages/constants/pages.editor.contents.constants';
import en from '../../../../../messages/en.json';

const headings = [
  { level: 1, position: 0, title: 'Introduction' },
  { level: 2, position: 12, title: 'Details' },
];

const renderOutline = () =>
  render(
    <NextIntlClientProvider locale="en" messages={en}>
      <PagesOutline headings={headings} onGoToHeading={() => undefined} title="On this page" />
    </NextIntlClientProvider>,
  );

describe('PagesOutline', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    localStorage.clear();
  });

  it('shows the headings with a control that says it can be hidden', () => {
    renderOutline();

    expect(screen.getByText('Introduction')).toBeTruthy();
    expect(screen.getByText('Details')).toBeTruthy();

    const hideButton = screen.getByRole('button', { name: 'Hide the outline' });
    expect(hideButton.getAttribute('aria-expanded')).toBe('true');
  });

  it('hides the headings without leaving an empty gap, and keeps a way to bring them back', () => {
    renderOutline();

    fireEvent.click(screen.getByRole('button', { name: 'Hide the outline' }));

    expect(screen.queryByText('Introduction')).toBeNull();
    expect(screen.queryByText('Details')).toBeNull();

    const showButton = screen.getByRole('button', { name: 'Show the outline' });
    expect(showButton.getAttribute('aria-expanded')).toBe('false');
  });

  it('brings the headings back on request', () => {
    renderOutline();

    fireEvent.click(screen.getByRole('button', { name: 'Hide the outline' }));
    fireEvent.click(screen.getByRole('button', { name: 'Show the outline' }));

    expect(screen.getByText('Introduction')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Hide the outline' })).toBeTruthy();
  });

  it('remembers the choice to hide across a reload', async () => {
    const { unmount } = renderOutline();
    fireEvent.click(screen.getByRole('button', { name: 'Hide the outline' }));
    expect(localStorage.getItem(PAGE_OUTLINE_VISIBILITY_STORAGE_KEY)).toBe('true');
    unmount();

    renderOutline();
    expect(await screen.findByRole('button', { name: 'Show the outline' })).toBeTruthy();
    expect(screen.queryByText('Introduction')).toBeNull();
  });

  it('renders nothing at all when the page has no headings, hidden or not', () => {
    localStorage.setItem(PAGE_OUTLINE_VISIBILITY_STORAGE_KEY, 'true');
    const { container } = render(
      <NextIntlClientProvider locale="en" messages={en}>
        <PagesOutline headings={[]} onGoToHeading={() => undefined} title="On this page" />
      </NextIntlClientProvider>,
    );

    expect(container.firstChild).toBeNull();
  });
});
