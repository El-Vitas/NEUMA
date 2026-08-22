import { describe, expect, it } from 'bun:test';
import { fireEvent, render, screen } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { PagesOutline } from '@/modules/pages/navigation/components/pages.outline';
import en from '../../../../../messages/en.json';

const headings = [
  { level: 1, position: 0, title: 'Introduction' },
  { level: 2, position: 12, title: 'Details' },
];

const renderOutline = (onGoToHeading: (position: number) => void = () => undefined) =>
  render(
    <NextIntlClientProvider locale="en" messages={en}>
      <PagesOutline headings={headings} onGoToHeading={onGoToHeading} title="On this page" />
    </NextIntlClientProvider>,
  );

const openTheRail = (): void => {
  fireEvent.mouseEnter(screen.getByRole('navigation', { name: 'On this page' }));
};

describe('PagesOutline', () => {
  it('keeps every heading reachable by name at rest, before the rail ever opens', () => {
    renderOutline();

    expect(screen.getByRole('button', { name: 'Introduction' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Details' })).toBeTruthy();
  });

  it('is only as wide as its marks at rest, with no title shown', () => {
    renderOutline();

    expect(screen.queryByText('On this page')).toBeNull();
    const list = screen.getByRole('button', { name: 'Introduction' }).parentElement;
    expect(list?.className).toContain('w-full');
    expect(list?.className).not.toContain('w-56');
  });

  it('opens into its own wider panel, with a title, once the rail is hovered', () => {
    renderOutline();
    openTheRail();

    expect(screen.getByText('On this page')).toBeTruthy();
    const list = screen.getByRole('button', { name: 'Introduction' }).parentElement;
    expect(list?.className).toContain('w-56');
  });

  it('narrows back to just its marks once the pointer leaves and nothing inside is focused', () => {
    renderOutline();
    const nav = screen.getByRole('navigation', { name: 'On this page' });
    fireEvent.mouseEnter(nav);
    expect(screen.getByText('On this page')).toBeTruthy();

    fireEvent.mouseLeave(nav);
    expect(screen.queryByText('On this page')).toBeNull();
    const list = screen.getByRole('button', { name: 'Introduction' }).parentElement;
    expect(list?.className).toContain('w-full');
    expect(list?.className).not.toContain('w-56');
  });

  it('opens the panel on keyboard focus, the same as it does on hover', () => {
    renderOutline();

    fireEvent.focusIn(screen.getByRole('button', { name: 'Introduction' }));

    expect(screen.getByText('On this page')).toBeTruthy();
  });

  it('closes the panel once focus moves outside the outline entirely', () => {
    renderOutline();
    const introduction = screen.getByRole('button', { name: 'Introduction' });
    const details = screen.getByRole('button', { name: 'Details' });
    fireEvent.focusIn(introduction);
    expect(screen.getByText('On this page')).toBeTruthy();

    fireEvent.focusOut(introduction, { relatedTarget: details });
    expect(screen.getByText('On this page')).toBeTruthy();

    fireEvent.focusOut(details, { relatedTarget: document.body });
    expect(screen.queryByText('On this page')).toBeNull();
  });

  it('closes the panel on Escape', () => {
    renderOutline();
    const nav = screen.getByRole('navigation', { name: 'On this page' });
    fireEvent.mouseEnter(nav);
    expect(screen.getByText('On this page')).toBeTruthy();

    fireEvent.keyDown(nav, { key: 'Escape' });
    expect(screen.queryByText('On this page')).toBeNull();
  });

  it('goes to the heading it was given when its control is chosen', () => {
    const positionsVisited: number[] = [];
    renderOutline((position) => positionsVisited.push(position));

    fireEvent.click(screen.getByRole('button', { name: 'Details' }));

    expect(positionsVisited).toEqual([12]);
  });

  it('marks no heading as being read when none of them can be found in the writing', () => {
    renderOutline();

    expect(screen.getByRole('button', { name: 'Introduction' }).getAttribute('aria-current')).toBeNull();
    expect(screen.getByRole('button', { name: 'Details' }).getAttribute('aria-current')).toBeNull();
  });

  it('renders nothing at all when the page has no headings', () => {
    const { container } = render(
      <NextIntlClientProvider locale="en" messages={en}>
        <PagesOutline headings={[]} onGoToHeading={() => undefined} title="On this page" />
      </NextIntlClientProvider>,
    );

    expect(container.firstChild).toBeNull();
  });
});
