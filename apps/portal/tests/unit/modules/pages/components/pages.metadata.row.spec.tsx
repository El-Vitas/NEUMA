import { describe, expect, it } from 'bun:test';
import { render, screen } from '@testing-library/react';

const { PagesMetadataRow } = await import('@/modules/pages/components/pages.metadata.row');

describe('PagesMetadataRow', () => {
  it('associates the label with its value through the given label id', () => {
    render(
      <PagesMetadataRow label="Location" labelId="row-label">
        <span>Marketing</span>
      </PagesMetadataRow>,
    );

    expect(screen.getByText('Location').id).toBe('row-label');
    expect(screen.getByText('Marketing')).toBeDefined();
  });

  it('stacks the label above the value on narrow screens instead of side by side', () => {
    const { container } = render(
      <PagesMetadataRow label="Location" labelId="row-label">
        <span>Marketing</span>
      </PagesMetadataRow>,
    );

    const row = container.firstElementChild;
    expect(row?.className).toContain('flex-col');
    expect(row?.className).toContain('sm:flex-row');
  });
});
