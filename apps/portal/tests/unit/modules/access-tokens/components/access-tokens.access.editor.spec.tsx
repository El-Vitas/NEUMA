import { describe, expect, it, mock } from 'bun:test';
import { USER_ROLE, type UserRole } from '@company-brain/shared';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import type { AccessTokenSpaceOption } from '@/modules/access-tokens/types/access-tokens.types';
import en from '../../../../../messages/en.json';

mock.module('@/modules/access-tokens/server/actions/access-tokens.actions', () => ({
  createAccessTokenAction: mock(async () => ({ data: undefined })),
  revokeAccessTokenAction: mock(async () => ({ data: undefined })),
  revokeWorkspaceAccessTokenAction: mock(async () => ({ data: undefined })),
  searchGrantablePagesAction: mock(async () => ({ data: [] })),
  updateAccessTokenAccessAction: mock(async () => ({ data: undefined })),
}));

const { AccessTokensAccessEditor } = await import('@/modules/access-tokens/components/access-tokens.access.editor');
const { useAccessTokensDraft } = await import('@/modules/access-tokens/hooks/use.access-tokens.draft');

interface IProps {
  readonly role: UserRole;
  readonly spaces: readonly AccessTokenSpaceOption[];
}

const EditorWithDraft = ({ role, spaces }: IProps) => {
  const draft = useAccessTokensDraft([]);
  return <AccessTokensAccessEditor draft={draft} role={role} spaces={spaces} />;
};

const renderEditor = (role: UserRole, spaces: readonly AccessTokenSpaceOption[] = []) =>
  render(
    <NextIntlClientProvider locale="en" messages={en}>
      <EditorWithDraft role={role} spaces={spaces} />
    </NextIntlClientProvider>,
  );

const rows = (): HTMLElement[] => screen.getAllByRole('listitem');

describe('AccessTokensAccessEditor', () => {
  /** Quien solo lee no ve ofrecido un nivel que después el servidor rechazaría. */
  it('offers someone who only reads the read level and custom, and no level that writes', () => {
    renderEditor(USER_ROLE.CLIENT);

    expect(screen.getByRole('radio', { name: /Read only/ })).toBeDefined();
    expect(screen.getByRole('radio', { name: /Custom/ })).toBeDefined();
    expect(screen.queryByRole('radio', { name: /Read and write/ })).toBeNull();
  });

  /** «Sin acceso» en todos los espacios no dice nada: solo aparece donde excluye algo. */
  it('offers no access only where it excludes something', () => {
    renderEditor(USER_ROLE.WORKER, [{ id: 'product', name: 'Product' }]);

    expect(screen.queryByRole('radio', { name: /No access/ })).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Add another place' }));

    expect(within(rows()[1] ?? document.body).getByRole('radio', { name: /No access/ })).toBeDefined();
  });

  it('asks for at least one permission once the level is custom, until one is ticked', () => {
    renderEditor(USER_ROLE.WORKER);

    fireEvent.click(screen.getByRole('radio', { name: /Custom/ }));
    expect(screen.getByRole('alert').textContent).toBe('Tick at least one permission.');

    fireEvent.click(screen.getByRole('checkbox', { name: 'Read pages' }));
    expect(screen.queryByRole('alert')).toBeNull();
  });

  /** Un lugar ya nombrado por otra fila no se puede volver a elegir. */
  it('does not let a second row pick all spaces, and lets it be removed', () => {
    renderEditor(USER_ROLE.WORKER, [{ id: 'product', name: 'Product' }]);

    fireEvent.click(screen.getByRole('button', { name: 'Add another place' }));
    const second = rows()[1] ?? document.body;

    expect((within(second).getByRole('radio', { name: 'All spaces' }) as HTMLInputElement).disabled).toBe(true);
    expect((within(second).getByRole('radio', { name: 'A space' }) as HTMLInputElement).checked).toBe(true);
    fireEvent.click(screen.getByRole('button', { name: 'Remove Product' }));
    expect(rows()).toHaveLength(1);
  });

  it('asks for a page when a row is set to one page', () => {
    renderEditor(USER_ROLE.WORKER);

    fireEvent.click(screen.getByRole('button', { name: 'Add another place' }));
    const second = rows()[1] ?? document.body;

    expect((within(second).getByRole('radio', { name: 'A page' }) as HTMLInputElement).checked).toBe(true);
    /** El botón dice qué es y qué tiene elegido, no solo «Página». */
    expect(within(second).getByRole('button', { name: 'Page Choose a page' })).toBeDefined();
  });
});
