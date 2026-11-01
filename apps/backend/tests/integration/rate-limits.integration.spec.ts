import { afterAll, beforeAll, describe, expect, it } from 'bun:test';
import request from 'supertest';
import { PASSWORD_CHANGE_RATE_LIMIT, SEARCH_RATE_LIMIT } from '@/common/constants/throttler.constants';
import { createSeededUser, type SeededUser } from '../helpers/block-access.helper';
import { bootstrapTestApp, type TestApp } from '../helpers/test-app.helper';

const HTTP_TOO_MANY_REQUESTS = 429;

describe('Per-user rate limits (Integration)', () => {
  let testApp: TestApp;

  const tryPasswordChange = (person: SeededUser) =>
    request(testApp.getServer())
      .patch(`/api/v1/users/${person.id}/password`)
      .set('Authorization', `Bearer ${person.token}`)
      .send({ currentPassword: 'notThePassword1', newPassword: 'anotherPassword456' });

  const search = (person: SeededUser) =>
    request(testApp.getServer())
      .get('/api/v1/search')
      .query({ query: 'plan' })
      .set('Authorization', `Bearer ${person.token}`);

  beforeAll(async () => {
    testApp = await bootstrapTestApp();
  });

  afterAll(async () => {
    await testApp.close();
  });

  it('stops guessing the current password after a few tries', async () => {
    const person = await createSeededUser(testApp, 'limit-password', 'WORKER');
    for (let attempt = 0; attempt < PASSWORD_CHANGE_RATE_LIMIT.perUserLimit; attempt += 1) {
      expect((await tryPasswordChange(person)).status).not.toBe(HTTP_TOO_MANY_REQUESTS);
    }

    const blocked = await tryPasswordChange(person);

    expect(blocked.status).toBe(HTTP_TOO_MANY_REQUESTS);
  });

  it('keeps one person from using up the searches of another', async () => {
    const busy = await createSeededUser(testApp, 'limit-search-busy', 'WORKER');
    const calm = await createSeededUser(testApp, 'limit-search-calm', 'WORKER');
    for (let attempt = 0; attempt < SEARCH_RATE_LIMIT.perUserLimit; attempt += 1) {
      await search(busy);
    }

    const blocked = await search(busy);
    const other = await search(calm);

    expect(blocked.status).toBe(HTTP_TOO_MANY_REQUESTS);
    expect(other.status).toBe(200);
  });
});
