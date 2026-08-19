import { describe, expect, it } from 'bun:test';
import { render } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { PagesIconGlyph } from '@/modules/pages/components/pages.icon.glyph';
import type { PageIcon } from '@/modules/pages/types/pages.icon.types';
import en from '../../../../../messages/en.json';

const renderGlyph = (icon: PageIcon) =>
  render(
    <NextIntlClientProvider locale="en" messages={en}>
      <PagesIconGlyph icon={icon} />
    </NextIntlClientProvider>,
  );

describe('PagesIconGlyph', () => {
  it('draws an emoji icon as its character', () => {
    const icon: PageIcon = { kind: 'emoji', value: '🚀' };

    const { container } = renderGlyph(icon);

    expect(container.textContent).toBe('🚀');
    expect(container.querySelector('img')).toBeNull();
  });

  it('draws an image icon through the shared page-asset route', () => {
    const icon: PageIcon = { assetId: '11111111-1111-1111-1111-111111111111', kind: 'image' };

    const { container } = renderGlyph(icon);

    expect(container.querySelector('img')).not.toBeNull();
  });
});
