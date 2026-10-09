import { describe, expect, it, mock } from 'bun:test';
import { fireEvent, render, screen } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import type { PageSchema, PageSchemaProperty } from '@/modules/pages/collections/types/pages.schema.types';
import type { PageSummary } from '@/modules/pages/types/pages.types';
import en from '../../../../../messages/en.json';
import { asPropertyOptions } from '../lib/pages.options.fixture';

mock.module('@/modules/pages/server/actions/pages.actions', () => ({
  setPageLockAction: async () => ({ data: undefined }),
  listPageMoveDestinationsAction: async () => ({ data: { pages: [], spaces: [] } }),
  movePageAction: async () => ({ data: undefined }),
}));
mock.module('@/modules/pages/attachments/server/actions/pages.attachments.actions', () => ({
  deletePageAttachmentAction: async () => ({ data: undefined }),
  downloadPageAttachmentAction: async () => ({ serverError: 'request' }),
  uploadPageAttachmentAction: async () => ({ serverError: 'request' }),
}));
// Stands in for the move form: avoids its server-only chain, which the move form's own spec mocks differently.
mock.module('@/modules/pages/navigation/components/pages.move.form', () => ({
  PagesMoveForm: ({ ariaLabelledBy }: { readonly ariaLabelledBy: string }) => (
    <button aria-labelledby={ariaLabelledBy} type="button">
      Space root
    </button>
  ),
}));

const { PagesPropertiesPanel } = await import('@/modules/pages/collections/components/pages.properties.panel');

const buildPage = (overrides: Partial<PageSummary> = {}): PageSummary => ({
  content: { content: [], schemaVersion: 1, type: 'doc' },
  createdAt: new Date('2026-01-01T00:00:00.000Z'),
  createdBy: null,
  id: '11111111-1111-4111-8111-111111111111',
  lifecycle: 'ACTIVE',
  order: 0,
  parentId: null,
  propertyValues: null,
  spaceId: '33333333-3333-4333-8333-333333333333',
  title: 'Task one',
  updatedAt: new Date('2026-01-01T00:00:00.000Z'),
  updatedBy: null,
  version: 1,
  ...overrides,
});

const titleProperty: PageSchemaProperty = {
  key: 'title',
  label: 'Title',
  options: null,
  required: true,
  type: 'TITLE',
};
const statusProperty: PageSchemaProperty = {
  key: 'status',
  label: 'Status',
  options: asPropertyOptions('todo', 'done'),
  required: true,
  type: 'SELECT',
};
const blockedProperty: PageSchemaProperty = {
  key: 'blocked',
  label: 'Blocked',
  options: null,
  required: false,
  type: 'CHECKBOX',
};

const buildSchema = (properties: readonly PageSchemaProperty[]): PageSchema => ({
  pageId: 'collection-1',
  properties,
  spaceId: 'space-1',
  views: [],
});

const renderPanel = (
  parentSchema: PageSchema | null,
  overrides: Partial<Parameters<typeof PagesPropertiesPanel>[0]> = {},
) =>
  render(
    <NextIntlClientProvider locale="en" messages={en}>
      <PagesPropertiesPanel
        canEdit
        onPropertyValueChange={mock(() => undefined)}
        parentSchema={parentSchema}
        propertyValues={{}}
        {...overrides}
      />
    </NextIntlClientProvider>,
  );

describe('PagesPropertiesPanel', () => {
  it('renders nothing when the page has no properties', () => {
    const { container } = renderPanel(null);
    expect(container.firstElementChild).toBeNull();
  });

  it('renders nothing when the parent schema only carries a TITLE property', () => {
    const { container } = renderPanel(buildSchema([titleProperty]));
    expect(container.firstElementChild).toBeNull();
  });

  it('renders a control for every non-TITLE property and never a TITLE input', () => {
    renderPanel(buildSchema([titleProperty, statusProperty, blockedProperty]));

    expect(screen.getByText('Status')).toBeDefined();
    expect(screen.getByText('Blocked')).toBeDefined();
    expect(screen.queryByText('Title')).toBeNull();
    expect(screen.queryByLabelText('Title')).toBeNull();
  });

  it('gives every property control an accessible name', () => {
    renderPanel(buildSchema([titleProperty, statusProperty, blockedProperty]));

    expect(screen.getByRole('combobox', { name: 'Status' })).toBeDefined();
    expect(screen.getByRole('checkbox', { name: 'Blocked' })).toBeDefined();
  });

  it('collapses beyond the visible limit and reveals the rest on demand', () => {
    const overflowProperties: PageSchemaProperty[] = Array.from({ length: 6 }, (_, index) => ({
      key: `field-${index}`,
      label: `Field ${index}`,
      options: null,
      required: false,
      type: 'RICH_TEXT',
    }));
    renderPanel(buildSchema([titleProperty, ...overflowProperties]));

    expect(screen.getByText('Field 0')).toBeDefined();
    expect(screen.getByText('Field 4')).toBeDefined();
    expect(screen.queryByText('Field 5')).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: 'Show 1 more' }));

    expect(screen.getByText('Field 5')).toBeDefined();
  });

  it('renders nothing when the page has no properties, cannot be moved, and has no attachments', () => {
    const { container } = renderPanel(null, {
      attachments: [],
      canEdit: false,
      page: null,
      pageId: null,
    });

    expect(container.firstElementChild).toBeNull();
  });

  it('reveals Location and Attachments only once expanded', () => {
    const page = buildPage();
    renderPanel(null, {
      attachments: [
        {
          id: 'attachment-1',
          mimeType: 'application/pdf',
          originalFilename: 'handbook.pdf',
          size: 1024,
          uploadedBy: 'Jane Doe',
        },
      ],
      canEdit: true,
      page,
      pageId: page.id,
      spaceId: page.spaceId,
    });

    expect(screen.queryByLabelText('Location')).toBeNull();
    expect(screen.queryByRole('list', { name: 'Attachments' })).toBeNull();
    expect(screen.getByRole('button', { name: 'Show 2 more' })).toBeDefined();

    fireEvent.click(screen.getByRole('button', { name: 'Show 2 more' }));

    expect(screen.getByLabelText('Location')).toBeDefined();
    expect(screen.getByRole('list', { name: 'Attachments' })).toBeDefined();
  });

  it('says nothing about emptiness when the page has no properties but the panel still holds other sections', () => {
    const page = buildPage();
    renderPanel(null, {
      canEdit: true,
      page,
      pageId: page.id,
      spaceId: page.spaceId,
    });

    expect(screen.queryByText('This page has no properties')).toBeNull();
  });

  it('offers what is left to see without calling those sections properties', () => {
    const page = buildPage();
    renderPanel(null, {
      canEdit: true,
      page,
      pageId: page.id,
      spaceId: page.spaceId,
    });

    expect(screen.getByRole('button', { name: 'Show 2 more' })).toBeDefined();
  });
});
