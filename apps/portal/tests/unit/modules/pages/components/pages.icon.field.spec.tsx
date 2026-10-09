import { describe, expect, it, mock } from 'bun:test';
import { render, screen } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import type { PageIcon } from '@/modules/pages/appearance/types/pages.icon.types';
import en from '../../../../../messages/en.json';

mock.module('server-only', () => ({}));
mock.module('@/modules/pages/appearance/server/actions/pages.icon.actions', () => ({
  removePageIconAction: async () => ({ data: undefined }),
  setPageIconEmojiAction: async () => ({ data: undefined }),
  setPageIconSymbolAction: async () => ({ data: undefined }),
  uploadPageIconImageAction: async () => ({ data: undefined }),
}));

const { PagesIconField } = await import('@/modules/pages/appearance/components/pages.icon.field');

const renderField = (overrides: Partial<Parameters<typeof PagesIconField>[0]> = {}) =>
  render(
    <NextIntlClientProvider locale="en" messages={en}>
      <PagesIconField
        canEdit
        icon={null}
        onIconChange={() => undefined}
        pageId="page-1"
        spaceId="space-1"
        title="Handbook"
        {...overrides}
      />
    </NextIntlClientProvider>,
  );

describe('PagesIconField', () => {
  it('shows the default mark while no icon has been chosen', () => {
    const { container } = renderField();

    const trigger = screen.getByRole('button', { name: 'Add an icon' });
    expect(trigger).toBeDefined();
    expect(container.querySelector('.h-0')).toBeNull();
    expect(trigger.querySelector('svg')).not.toBeNull();
  });

  it('shows the emoji as the icon once one is set', () => {
    const icon: PageIcon = { kind: 'emoji', value: '🚀' };
    renderField({ icon });

    const trigger = screen.getByRole('button', { name: 'Icon for Handbook' });
    expect(trigger.textContent).toContain('🚀');
  });

  it('renders an image icon instead of the emoji glyph', () => {
    const icon: PageIcon = { assetId: '11111111-1111-1111-1111-111111111111', kind: 'image' };
    const { container } = renderField({ icon });

    expect(container.querySelector('img')).not.toBeNull();
  });

  it('shows nothing at all for a reader who cannot edit and a page with no icon', () => {
    const { container } = renderField({ canEdit: false, icon: null });

    expect(container.textContent).toBe('');
  });

  it('shows a read-only icon without offering to change it', () => {
    const icon: PageIcon = { kind: 'emoji', value: '🚀' };
    renderField({ canEdit: false, icon });

    expect(screen.queryByRole('button')).toBeNull();
    expect(screen.getByLabelText('Icon for Handbook').textContent).toContain('🚀');
  });
});
