import { describe, expect, it } from 'bun:test';
import { ACCESS_TOKEN_PERMISSIONS, type AccessTokenAccess, USER_ROLE } from '@company-brain/shared';
import { AccessTokensService } from '@/modules/access-tokens/access-tokens.service';
import { ACCESS_TOKEN_SECRET_PREFIX } from '@/modules/access-tokens/constants/access-tokens.constants';
import type {
  AccessTokenOwner,
  AccessTokenRecord,
  AccessTokenWithOwner,
} from '@/modules/access-tokens/domain/access-token.domain.types';
import { hashAccessTokenSecret } from '@/modules/access-tokens/infrastructure/adapters/access-token.secret.adapter';
import type { AccessTokenRepositoryContract } from '@/modules/access-tokens/types/access-token.types';

const readEverywhere: AccessTokenAccess = { allSpaces: [ACCESS_TOKEN_PERMISSIONS.pagesRead], spaces: [] };
const writeInProduct: AccessTokenAccess = {
  allSpaces: [],
  spaces: [{ permissions: [ACCESS_TOKEN_PERMISSIONS.pagesWrite], spaceId: 'product' }],
};

const worker: AccessTokenOwner = { role: USER_ROLE.WORKER, userId: 'user-a', workspaceId: 'workspace-a' };
const client: AccessTokenOwner = { role: USER_ROLE.CLIENT, userId: 'user-c', workspaceId: 'workspace-a' };
const admin: AccessTokenOwner = { role: USER_ROLE.ADMIN, userId: 'user-admin', workspaceId: 'workspace-a' };

const someSecret = `${ACCESS_TOKEN_SECRET_PREFIX}${'a'.repeat(43)}`;

const record = (overrides: Partial<AccessTokenRecord> = {}): AccessTokenRecord => ({
  allSpaces: [],
  createdAt: new Date('2026-09-01T00:00:00.000Z'),
  displayPrefix: 'cbk_abcdefgh',
  expiresAt: null,
  hiddenSpaceCount: 0,
  id: 'token-a',
  lastUsedAt: null,
  name: 'Claude en mi portátil',
  spaces: [],
  ...overrides,
});

const withOwner = (overrides: Partial<AccessTokenWithOwner> = {}): AccessTokenWithOwner => ({
  access: readEverywhere,
  expiresAt: null,
  id: 'token-a',
  lastUsedAt: null,
  owner: { id: 'user-a', isActive: true, role: USER_ROLE.WORKER },
  revokedAt: null,
  workspaceId: 'workspace-a',
  ...overrides,
});

const createRepository = (overrides: Partial<AccessTokenRepositoryContract> = {}): AccessTokenRepositoryContract => ({
  countAccessibleSpaces: (spaceIds) => Promise.resolve(spaceIds.length),
  createWithinLimit: (input) => Promise.resolve(record({ displayPrefix: input.displayPrefix, name: input.name })),
  findBySecretHash: () => Promise.resolve(null),
  listLive: () => Promise.resolve([record()]),
  listLiveInWorkspace: () => Promise.resolve([]),
  replaceAccess: () => Promise.resolve(record()),
  revoke: () => Promise.resolve(true),
  revokeInWorkspace: () => Promise.resolve(true),
  touch: () => Promise.resolve(undefined),
  ...overrides,
});

describe('crear un token', () => {
  /** El secreto se enseña una sola vez: después solo queda su hash, y nadie puede volver a leerlo. */
  it('hands back the secret once, and stores only its hash', async () => {
    let storedHash = '';
    const service = new AccessTokensService(
      createRepository({
        createWithinLimit: (input) => {
          storedHash = input.secretHash;
          return Promise.resolve(record({ displayPrefix: input.displayPrefix, name: input.name }));
        },
      }),
    );

    const result = await service.createToken(worker, { access: readEverywhere, expiresAt: null, name: 'Bot' });

    expect(result.isOk()).toBe(true);
    const created = result.getValue();
    expect(created.secret.startsWith(ACCESS_TOKEN_SECRET_PREFIX)).toBe(true);
    expect(storedHash).toBe(hashAccessTokenSecret(created.secret));
    expect(storedHash).not.toContain(created.secret);
  });

  it('refuses an access with nothing in it', async () => {
    const service = new AccessTokensService(createRepository());

    const result = await service.createToken(worker, {
      access: { allSpaces: [], spaces: [] },
      expiresAt: null,
      name: 'Bot',
    });

    expect(result.getError().code).toBe('ACCESS_TOKEN_ACCESS_INVALID');
  });

  /** Quien solo lee no fabrica una llave que escriba por él. */
  it('refuses to give writing to a token whose owner can only read', async () => {
    const service = new AccessTokensService(createRepository());

    const result = await service.createToken(client, { access: writeInProduct, expiresAt: null, name: 'Bot' });

    expect(result.getError().code).toBe('ACCESS_TOKEN_PERMISSION_BEYOND_OWNER');
  });

  /** Un espacio que el dueño no ve no se puede dar, tampoco a un espacio privado ajeno. */
  it('refuses to name a space its owner cannot see', async () => {
    const service = new AccessTokensService(createRepository({ countAccessibleSpaces: () => Promise.resolve(0) }));

    const result = await service.createToken(worker, { access: writeInProduct, expiresAt: null, name: 'Bot' });

    expect(result.getError().code).toBe('ACCESS_TOKEN_SPACE_NOT_ACCESSIBLE');
  });

  it('refuses a new one once the person already holds as many as allowed', async () => {
    const service = new AccessTokensService(createRepository({ createWithinLimit: () => Promise.resolve(null) }));

    const result = await service.createToken(worker, { access: readEverywhere, expiresAt: null, name: 'Uno más' });

    expect(result.getError().code).toBe('ACCESS_TOKEN_LIMIT_REACHED');
  });

  it('refuses an expiry that has already passed', async () => {
    const service = new AccessTokensService(createRepository());

    const result = await service.createToken(worker, {
      access: readEverywhere,
      expiresAt: new Date('2020-01-01T00:00:00.000Z'),
      name: 'Vencido de nacimiento',
    });

    expect(result.getError().code).toBe('ACCESS_TOKEN_EXPIRY_IN_PAST');
  });
});

describe('cambiar lo que un token tiene dado', () => {
  it('applies the same limits as creating one', async () => {
    const service = new AccessTokensService(createRepository());

    const result = await service.updateAccess(client, 'token-a', writeInProduct);

    expect(result.getError().code).toBe('ACCESS_TOKEN_PERMISSION_BEYOND_OWNER');
  });

  /** Solo su dueño lo cambia: para cualquier otra persona, ese token no existe. */
  it('says it was not found when it is not one of the caller tokens', async () => {
    const service = new AccessTokensService(createRepository({ replaceAccess: () => Promise.resolve(null) }));

    const result = await service.updateAccess(worker, 'token-ajeno', readEverywhere);

    expect(result.getError().code).toBe('ACCESS_TOKEN_NOT_FOUND');
  });
});

describe('los tokens de todo el espacio de trabajo', () => {
  it('are listed only for whoever runs the workspace', async () => {
    const service = new AccessTokensService(createRepository());

    expect((await service.listWorkspaceTokens(worker)).getError().code).toBe('ACCESS_TOKEN_ADMIN_ONLY');
    expect((await service.listWorkspaceTokens(admin)).isOk()).toBe(true);
  });

  it('can be revoked only by whoever runs the workspace', async () => {
    const service = new AccessTokensService(createRepository());

    expect((await service.revokeWorkspaceToken(worker, 'token-a')).getError().code).toBe('ACCESS_TOKEN_ADMIN_ONLY');
    expect((await service.revokeWorkspaceToken(admin, 'token-a')).isOk()).toBe(true);
  });
});

describe('entrar con un token', () => {
  it('answers who it belongs to and what it holds', async () => {
    const service = new AccessTokensService(createRepository({ findBySecretHash: () => Promise.resolve(withOwner()) }));

    const principal = await service.resolvePrincipal(someSecret);

    expect(principal).toEqual({
      access: readEverywhere,
      role: USER_ROLE.WORKER,
      tokenId: 'token-a',
      userId: 'user-a',
      workspaceId: 'workspace-a',
    });
  });

  it('answers nobody for something that is not even shaped like a token, without asking the database', async () => {
    let asked = false;
    const service = new AccessTokensService(
      createRepository({
        findBySecretHash: () => {
          asked = true;
          return Promise.resolve(withOwner());
        },
      }),
    );

    expect(await service.resolvePrincipal('eyJhbGciOiJIUzI1NiJ9.a.b')).toBeNull();
    expect(asked).toBe(false);
  });

  it('answers nobody for a revoked token', async () => {
    const service = new AccessTokensService(
      createRepository({
        findBySecretHash: () => Promise.resolve(withOwner({ revokedAt: new Date('2026-09-01T00:00:00.000Z') })),
      }),
    );

    expect(await service.resolvePrincipal(someSecret)).toBeNull();
  });

  /** Desactivar a una persona corta también a los agentes que actuaban por ella. */
  it('answers nobody when the person who owns it was deactivated', async () => {
    const service = new AccessTokensService(
      createRepository({
        findBySecretHash: () =>
          Promise.resolve(withOwner({ owner: { id: 'user-a', isActive: false, role: USER_ROLE.WORKER } })),
      }),
    );

    expect(await service.resolvePrincipal(someSecret)).toBeNull();
  });
});
