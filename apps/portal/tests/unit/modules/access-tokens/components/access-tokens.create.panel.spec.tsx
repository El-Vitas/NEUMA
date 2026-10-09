import { beforeEach, describe, expect, it, mock } from 'bun:test';
import { ACCESS_TOKEN_PERMISSIONS, MILLISECONDS_IN_A_DAY, USER_ROLE } from '@company-brain/shared';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import type { ReactNode } from 'react';
import { z } from 'zod';
import en from '../../../../../messages/en.json';
import { createAccessTokensActionsMock } from '../../../../mocks/access-tokens.actions.mock';

const secret = 'cbk_only-shown-once';
/** Cuánto puede correrse el vencimiento: una hora de cambio de horario, y lo que tarda la prueba. */
const EXPIRY_TOLERANCE_MS = 2 * 60 * 60 * 1000;
const tokensPath = '/settings/tokens';
const sentShape = z.object({
  access: z.unknown(),
  expiresAt: z.string().nullable(),
  name: z.string(),
});

const createAccessTokenAction = mock(async (_input: unknown) => ({
  data: {
    secret,
    token: {
      allSpaces: [ACCESS_TOKEN_PERMISSIONS.pagesRead, ACCESS_TOKEN_PERMISSIONS.collectionsRead],
      createdAt: new Date('2026-09-21T12:00:00.000Z'),
      displayPrefix: 'cbk_only-sho',
      expiresAt: null,
      hiddenPlaceCount: 0,
      id: '11111111-1111-4111-8111-111111111111',
      lastUsedAt: null,
      name: 'Claude',
      pages: [],
      spaces: [],
    },
  },
}));

mock.module('@/modules/access-tokens/server/actions/access-tokens.actions', () =>
  createAccessTokensActionsMock({ createAccessTokenAction }),
);

/** La navegación del portal necesita el enrutador de Next, que no existe fuera de una página. */
mock.module('@/i18n/navigation', () => ({
  Link: ({ children, href }: { readonly children: ReactNode; readonly href: string }) => <a href={href}>{children}</a>,
  useRouter: () => ({ push: () => undefined }),
}));

const { AccessTokensCreatePanel } = await import('@/modules/access-tokens/components/access-tokens.create.panel');

const renderPanel = (takenNames: readonly string[] = []) =>
  render(
    <NextIntlClientProvider locale="en" messages={en}>
      <AccessTokensCreatePanel
        mcpUrl="https://brain.example/api/v1/mcp"
        role={USER_ROLE.WORKER}
        spaces={[]}
        takenNames={takenNames}
      />
    </NextIntlClientProvider>,
  );

const typeName = (name: string): void => {
  fireEvent.change(screen.getByLabelText('Name'), { target: { value: name } });
};

const submitButton = (): HTMLButtonElement => {
  const button = screen.getByRole('button', { name: 'Create token' });
  if (!(button instanceof HTMLButtonElement)) throw new Error('No submit button');
  return button;
};

describe('AccessTokensCreatePanel', () => {
  beforeEach(() => {
    createAccessTokenAction.mockClear();
  });

  it('sends the name, an expiry thirty days away and read access everywhere by default', async () => {
    const before = Date.now();
    renderPanel();
    typeName('Claude');
    fireEvent.click(submitButton());

    await waitFor(() => expect(createAccessTokenAction).toHaveBeenCalled());
    const sent = sentShape.parse(createAccessTokenAction.mock.calls.at(-1)?.[0]);
    expect(sent.name).toBe('Claude');
    expect(sent.access).toEqual({
      allSpaces: [ACCESS_TOKEN_PERMISSIONS.pagesRead, ACCESS_TOKEN_PERMISSIONS.collectionsRead],
      pages: [],
      spaces: [],
    });
    const expiresIn = new Date(sent.expiresAt ?? '').getTime() - before;
    expect(Math.abs(expiresIn - 30 * MILLISECONDS_IN_A_DAY)).toBeLessThan(EXPIRY_TOLERANCE_MS);
  });

  /** Dos tokens activos que se leen igual se confunden al revocar: se avisa antes de enviar. */
  it('says a name is already in use and does not let it be sent', () => {
    renderPanel(['Claude del equipo']);
    typeName('  claude DEL equipo ');

    expect(screen.getByRole('alert').textContent).toBe(en.accessTokens.form.nameTaken);
    expect(submitButton().disabled).toBe(true);
  });

  it('asks for a day when the expiry is a chosen date, and sends the end of that day', async () => {
    renderPanel();
    typeName('Con fecha');
    fireEvent.click(screen.getByRole('radio', { name: 'Choose a date' }));

    expect(submitButton().disabled).toBe(true);
    fireEvent.change(screen.getByLabelText('Last day it works'), { target: { value: '2099-03-15' } });
    fireEvent.click(submitButton());

    await waitFor(() => expect(createAccessTokenAction).toHaveBeenCalledTimes(1));
    const sent = sentShape.parse(createAccessTokenAction.mock.calls.at(-1)?.[0]);
    expect(sent.expiresAt).toBe(new Date(new Date(2099, 2, 16).getTime() - 1).toISOString());
  });

  it('sends no expiry when the token should never expire', async () => {
    renderPanel();
    typeName('Para siempre');
    fireEvent.click(screen.getByRole('radio', { name: 'No expiration' }));
    fireEvent.click(submitButton());

    await waitFor(() => expect(createAccessTokenAction).toHaveBeenCalledTimes(1));
    expect(sentShape.parse(createAccessTokenAction.mock.calls.at(-1)?.[0]).expiresAt).toBeNull();
  });

  /** El secreto se ve una vez, listo para copiar y pegado en la configuración del agente. */
  it('shows the secret once, inside the agent configuration too, and leads back to the tokens', async () => {
    renderPanel();
    typeName('Claude');
    fireEvent.click(submitButton());

    const token = await screen.findByLabelText('Token');
    expect((token as HTMLInputElement).value).toBe(secret);
    expect((screen.getByLabelText('Agent configuration') as HTMLTextAreaElement).value).toContain(`Bearer ${secret}`);
    expect(screen.queryByRole('button', { name: 'Create token' })).toBeNull();
    expect(screen.getByRole('link', { name: 'Done, I copied it' }).getAttribute('href')).toBe(tokensPath);
  });
});
