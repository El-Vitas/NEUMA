import { describe, expect, it, mock } from 'bun:test';
import { render, screen } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import type { PageSchema } from '@/modules/pages/types/pages.schema.types';
import en from '../../../../../messages/en.json';

const { PagesPropertiesPanel } = await import('@/modules/pages/components/pages.properties.panel');

const schema: PageSchema = {
  pageId: 'collection-1',
  properties: [
    { key: 'title', label: 'Title', options: null, required: true, type: 'TITLE' },
    { key: 'status', label: 'Status', options: ['todo', 'done'], required: true, type: 'SELECT' },
    { key: 'blocked', label: 'Blocked', options: null, required: false, type: 'CHECKBOX' },
  ],
  spaceId: 'space-1',
  views: [],
};

const renderPanel = (parentSchema: PageSchema | null) =>
  render(
    <NextIntlClientProvider locale="en" messages={en}>
      <PagesPropertiesPanel
        canEdit
        onPropertyValueChange={mock(() => undefined)}
        parentSchema={parentSchema}
        propertyValues={{}}
      />
    </NextIntlClientProvider>,
  );

describe('PagesPropertiesPanel', () => {
  it('renders nothing when the page is not a row of a schema-carrying parent', () => {
    const { container } = renderPanel(null);
    expect(container.firstElementChild).toBeNull();
  });

  it('renders nothing when the parent schema only carries a TITLE property', () => {
    const { container } = renderPanel({ pageId: 'p', properties: [schema.properties[0]], spaceId: 's', views: [] });
    expect(container.firstElementChild).toBeNull();
  });

  it('renders a control for every non-TITLE property and never a TITLE input', () => {
    renderPanel(schema);

    expect(screen.getByText('Status')).toBeDefined();
    expect(screen.getByText('Blocked')).toBeDefined();
    expect(screen.queryByText('Title')).toBeNull();
    expect(screen.queryByLabelText('Title')).toBeNull();
  });
});
