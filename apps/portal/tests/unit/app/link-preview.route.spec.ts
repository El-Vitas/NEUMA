import { beforeEach, describe, expect, it, mock } from 'bun:test';

const session: { user: { id: string } | null; fails: boolean } = { fails: false, user: null };
let fetched = 0;

mock.module('@/shared/server/lib/current-user.server', () => ({
  getCurrentUser: async () => {
    if (session.fails) throw new Error('backend down');
    return session.user;
  },
}));

mock.module('@/modules/pages/links/server/lib/pages.link-preview.fetch.server', () => ({
  fetchLinkPreviewHtml: async () => {
    fetched += 1;
    return '<title>Hola</title>';
  },
}));

const { GET } = await import('@/app/api/link-preview/route');

const ask = (): Promise<Response> =>
  GET(new Request(`http://portal.test/api/link-preview?url=${encodeURIComponent('https://ejemplo.com/a')}`));

describe('GET /api/link-preview', () => {
  beforeEach(() => {
    session.user = null;
    session.fails = false;
    fetched = 0;
  });

  it('refuses a caller whose session the backend does not recognise', async () => {
    const answer = await ask();

    expect(answer.status).toBe(401);
    expect(fetched).toBe(0);
  });

  it('answers 503 when the session cannot be checked, without reaching out to the site', async () => {
    session.fails = true;

    const answer = await ask();

    expect(answer.status).toBe(503);
    expect(fetched).toBe(0);
  });

  it('reads the title for a signed-in user', async () => {
    session.user = { id: 'user-ok' };

    const answer = await ask();

    expect(answer.status).toBe(200);
    expect(await answer.json()).toMatchObject({ title: 'Hola' });
  });

  it('limits each user on their own', async () => {
    session.user = { id: 'user-busy' };
    const statuses: number[] = [];
    for (let turn = 0; turn < 31; turn += 1) statuses.push((await ask()).status);
    session.user = { id: 'user-other' };

    expect(statuses.at(-1)).toBe(429);
    expect((await ask()).status).toBe(200);
  });
});
