import { afterEach, describe, expect, it, mock } from 'bun:test';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import type { PageTemplateListing } from '@/modules/pages/templates/types/pages.templates.types';
import en from '../../../../../../messages/en.json';

const refresh = mock(() => undefined);
let finishSettingDefault: () => void = () => undefined;
const setDefault = mock(
  () =>
    new Promise<{ data: PageTemplateListing }>((resolve) => {
      finishSettingDefault = () => resolve({ data: { defaultTemplateId: null, templates: [] } });
    }),
);

mock.module('@/i18n/navigation', () => ({
  Link: ({ children, href }: { children: unknown; href: string }) => <a href={href}>{children as never}</a>,
  useRouter: () => ({ refresh }),
}));
mock.module('@/modules/pages/templates/server/actions/pages.templates.actions', () => ({
  createPageTemplateAction: async () => ({ data: {} }),
  deletePageTemplateAction: async () => ({ data: { deleted: true } }),
  listPageTemplatesAction: async () => ({ data: { defaultTemplateId: null, templates: [] } }),
  setDefaultPageTemplateAction: setDefault,
  updatePageTemplateAction: async () => ({ data: {} }),
}));

const { PagesTemplatesPanel } = await import('@/modules/pages/templates/components/pages.templates.panel');

const template = (id: string, title: string, isDefault: boolean) => ({
  id,
  isDefault,
  propertyValues: {},
  title,
  variables: {},
});

const listing: PageTemplateListing = {
  defaultTemplateId: 'first',
  templates: [template('first', 'Weekly', true), template('second', 'Incident', false)],
};

const renderPanel = () =>
  render(
    <NextIntlClientProvider locale="en" messages={en}>
      <PagesTemplatesPanel
        collectionId="collection-1"
        listing={listing}
        onClose={() => undefined}
        properties={[]}
        spaceId="space-1"
      />
    </NextIntlClientProvider>,
  );

const readPressed = (): (null | string)[] =>
  screen.getAllByTestId('template-default').map((button) => button.getAttribute('aria-pressed'));

describe('PagesTemplatesPanel', () => {
  afterEach(() => {
    cleanup();
    mock.clearAllMocks();
  });

  it('shows the chosen default at once, without waiting for the server to answer', async () => {
    renderPanel();
    expect(readPressed()).toEqual(['true', 'false']);

    fireEvent.click(screen.getAllByTestId('template-default')[1] as HTMLElement);

    await waitFor(() => expect(readPressed()).toEqual(['false', 'true']));
    expect(setDefault).toHaveBeenCalledTimes(1);
    finishSettingDefault();
  });

  it('shows the default taken away at once when the default is pressed again', async () => {
    renderPanel();

    fireEvent.click(screen.getAllByTestId('template-default')[0] as HTMLElement);

    await waitFor(() => expect(readPressed()).toEqual(['false', 'false']));
    finishSettingDefault();
  });
});
