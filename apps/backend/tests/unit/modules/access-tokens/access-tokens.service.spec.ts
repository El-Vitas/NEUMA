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
import type {
  AccessTokenCreationLimits,
  AccessTokenLogger,
  AccessTokenRepositoryContract,
} from '@/modules/access-tokens/types/access-token.types';

const read = ACCESS_TOKEN_PERMISSIONS.pagesRead;

/** Un log que guarda lo que se le cuenta, para revisar qué quedó anotado. */
const createLog = () => {
  const entries: { readonly fields: Record<string, unknown>; readonly message: string }[] = [];
  const write = (fields: Record<string, unknown>, message: string) => {
    entries.push({ fields, message });
  };
  return { entries, logger: { error: write, info: write } };
};

const createService = (repository: AccessTokenRepositoryContract, logger: AccessTokenLogger = createLog().logger) =>
  new AccessTokensService(repository, logger);
const pageId = '0199a1c2-0000-7000-8000-000000000001';

const readEverywhere: AccessTokenAccess = { allSpaces: [read], pages: [], spaces: [] };
const writeInProduct: AccessTokenAccess = {
  allSpaces: [],
  pages: [],
  spaces: [{ permissions: [ACCESS_TOKEN_PERMISSIONS.pagesWrite], spaceId: 'product' }],
};
const readOnePage: AccessTokenAccess = { allSpaces: [], pages: [{ pageId, permissions: [read] }], spaces: [] };
const everythingButHr: AccessTokenAccess = {
  allSpaces: [read],
  pages: [],
  spaces: [{ permissions: [], spaceId: 'hr' }],
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
  hiddenPlaceCount: 0,
  id: 'token-a',
  lastUsedAt: null,
  name: 'Claude en mi portátil',
  pages: [],
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
  countAccessiblePages: (pageIds) => Promise.resolve(pageIds.length),
  countAccessibleSpaces: (spaceIds) => Promise.resolve(spaceIds.length),
  createWithinLimit: (input) =>
    Promise.resolve({ kind: 'CREATED', token: record({ displayPrefix: input.displayPrefix, name: input.name }) }),
  findBySecretHash: () => Promise.resolve(null),
  listLive: () => Promise.resolve([record()]),
  listLiveInWorkspace: () => Promise.resolve([]),
  replaceAccess: () => Promise.resolve(record()),
  revoke: () => Promise.resolve(true),
  revokeInWorkspace: () => Promise.resolve(true),
  touch: () => Promise.resolve(undefined),
  ...overrides,
});

/** Un repositorio que anota si se llegó a escribir: un rechazo no puede dejar nada a medias. */
const createWatchedRepository = (overrides: Partial<AccessTokenRepositoryContract> = {}) => {
  const writes: string[] = [];
  const repository = createRepository({
    createWithinLimit: (input) => {
      writes.push('create');
      return Promise.resolve({ kind: 'CREATED', token: record({ name: input.name }) });
    },
    replaceAccess: () => {
      writes.push('replace');
      return Promise.resolve(record());
    },
    ...overrides,
  });
  return { repository, writes };
};

describe('crear un token', () => {
  /** El secreto se enseña una sola vez: después solo queda su hash, y nadie puede volver a leerlo. */
  it('hands back the secret once, and stores only its hash', async () => {
    let storedHash = '';
    const service = createService(
      createRepository({
        createWithinLimit: (input) => {
          storedHash = input.secretHash;
          return Promise.resolve({ kind: 'CREATED', token: record({ name: input.name }) });
        },
      }),
    );

    const result = await service.createToken(worker, { access: readEverywhere, expiresAt: null, name: 'Bot' });

    const created = result.getValue();
    expect(created.secret.startsWith(ACCESS_TOKEN_SECRET_PREFIX)).toBe(true);
    expect(storedHash).toBe(hashAccessTokenSecret(created.secret));
    expect(storedHash).not.toContain(created.secret);
  });

  it('stores the name without the spaces around it', async () => {
    let storedName = '';
    const service = createService(
      createRepository({
        createWithinLimit: (input) => {
          storedName = input.name;
          return Promise.resolve({ kind: 'CREATED', token: record({ name: input.name }) });
        },
      }),
    );

    await service.createToken(worker, { access: readEverywhere, expiresAt: null, name: '  Bot del equipo  ' });

    expect(storedName).toBe('Bot del equipo');
  });

  it('accepts a page rule and an exclusion of a space its owner sees', async () => {
    const service = createService(createRepository());

    expect((await service.createToken(worker, { access: readOnePage, expiresAt: null, name: 'Uno' })).isOk()).toBe(
      true,
    );
    expect((await service.createToken(worker, { access: everythingButHr, expiresAt: null, name: 'Dos' })).isOk()).toBe(
      true,
    );
  });

  it.each([
    ['an access with nothing in it', { allSpaces: [], pages: [], spaces: [] }, 'ACCESS_TOKEN_ACCESS_INVALID'],
    [
      'an access made only of exclusions',
      { allSpaces: [], pages: [{ pageId, permissions: [] }], spaces: [] },
      'ACCESS_TOKEN_ACCESS_INVALID',
    ],
    ['an access with no pages list', { allSpaces: [read], spaces: [] }, 'ACCESS_TOKEN_ACCESS_INVALID'],
    [
      'a page named by something that is not an id',
      { allSpaces: [], pages: [{ pageId: 'x', permissions: [read] }], spaces: [] },
      'ACCESS_TOKEN_ACCESS_INVALID',
    ],
  ])('refuses %s before writing anything', async (_label, access, code) => {
    const { repository, writes } = createWatchedRepository();
    const service = createService(repository);

    const result = await service.createToken(worker, { access, expiresAt: null, name: 'Bot' });

    expect(result.getError().code).toBe(code);
    expect(writes).toEqual([]);
  });

  /** Quien solo lee no fabrica una llave que escriba por él, tampoco escondiendo la escritura en una página. */
  it('refuses to give writing to a token whose owner can only read, wherever it is given', async () => {
    const { repository, writes } = createWatchedRepository();
    const service = createService(repository);
    const writeOnePage = {
      allSpaces: [],
      pages: [{ pageId, permissions: [ACCESS_TOKEN_PERMISSIONS.pagesWrite] }],
      spaces: [],
    };

    expect(
      (await service.createToken(client, { access: writeInProduct, expiresAt: null, name: 'A' })).getError().code,
    ).toBe('ACCESS_TOKEN_PERMISSION_BEYOND_OWNER');
    expect(
      (await service.createToken(client, { access: writeOnePage, expiresAt: null, name: 'B' })).getError().code,
    ).toBe('ACCESS_TOKEN_PERMISSION_BEYOND_OWNER');
    expect(writes).toEqual([]);
  });

  /** Un lugar que el dueño no ve no se puede nombrar, ni para darlo ni para cerrarlo: confirmaría que existe. */
  it('refuses to name a space its owner cannot see, even to close it', async () => {
    const { repository, writes } = createWatchedRepository({ countAccessibleSpaces: () => Promise.resolve(0) });
    const service = createService(repository);

    const result = await service.createToken(worker, { access: everythingButHr, expiresAt: null, name: 'Bot' });

    expect(result.getError().code).toBe('ACCESS_TOKEN_SPACE_NOT_ACCESSIBLE');
    expect(writes).toEqual([]);
  });

  it('refuses to name a page its owner cannot see, is in the trash or does not exist', async () => {
    const { repository, writes } = createWatchedRepository({ countAccessiblePages: () => Promise.resolve(0) });
    const service = createService(repository);

    const result = await service.createToken(worker, { access: readOnePage, expiresAt: null, name: 'Bot' });

    expect(result.getError().code).toBe('ACCESS_TOKEN_PAGE_NOT_ACCESSIBLE');
    expect(writes).toEqual([]);
  });

  it.each([
    ['empty', '   '],
    ['with a line break', 'Bot\nadmin'],
    ['too long', 'a'.repeat(200)],
  ])('refuses a name that is %s before writing anything', async (_label, name) => {
    const { repository, writes } = createWatchedRepository();
    const service = createService(repository);

    const result = await service.createToken(worker, { access: readEverywhere, expiresAt: null, name });

    expect(result.getError().code).toBe('ACCESS_TOKEN_NAME_INVALID');
    expect(writes).toEqual([]);
  });

  /** El nombre se compara dentro de la transacción que guarda, con los tokens vivos de ese momento. */
  it('refuses a name another live token of the person already reads as', async () => {
    let limitsGiven: AccessTokenCreationLimits | null = null;
    const service = createService(
      createRepository({
        createWithinLimit: (_input, _role, limits) => {
          limitsGiven = limits;
          return Promise.resolve(
            limits.isNameTaken(['BOT  del equipo']) ? { kind: 'NAME_TAKEN' } : { kind: 'CREATED', token: record() },
          );
        },
      }),
    );

    const result = await service.createToken(worker, {
      access: readEverywhere,
      expiresAt: null,
      name: 'bot del Equipo',
    });

    expect(result.getError().code).toBe('ACCESS_TOKEN_NAME_TAKEN');
    expect(limitsGiven).not.toBeNull();
  });

  it('refuses a new one once the person already holds as many as allowed', async () => {
    const service = createService(
      createRepository({ createWithinLimit: () => Promise.resolve({ kind: 'LIMIT_REACHED' }) }),
    );

    const result = await service.createToken(worker, { access: readEverywhere, expiresAt: null, name: 'Uno más' });

    expect(result.getError().code).toBe('ACCESS_TOKEN_LIMIT_REACHED');
  });

  it('refuses an expiry that has already passed, or that is not a date', async () => {
    const { repository, writes } = createWatchedRepository();
    const service = createService(repository);

    const past = await service.createToken(worker, {
      access: readEverywhere,
      expiresAt: new Date('2020-01-01T00:00:00.000Z'),
      name: 'Vencido de nacimiento',
    });
    const invalid = await service.createToken(worker, {
      access: readEverywhere,
      expiresAt: new Date('not a date'),
      name: 'Sin fecha',
    });

    expect(past.getError().code).toBe('ACCESS_TOKEN_EXPIRY_IN_PAST');
    expect(invalid.getError().code).toBe('ACCESS_TOKEN_EXPIRY_IN_PAST');
    expect(writes).toEqual([]);
  });
});

describe('cambiar lo que un token tiene dado', () => {
  it('applies the same limits as creating one, before writing anything', async () => {
    const { repository, writes } = createWatchedRepository({ countAccessiblePages: () => Promise.resolve(0) });
    const service = createService(repository);

    expect((await service.updateAccess(client, 'token-a', writeInProduct)).getError().code).toBe(
      'ACCESS_TOKEN_PERMISSION_BEYOND_OWNER',
    );
    expect((await service.updateAccess(worker, 'token-a', readOnePage)).getError().code).toBe(
      'ACCESS_TOKEN_PAGE_NOT_ACCESSIBLE',
    );
    expect(writes).toEqual([]);
  });

  /** Solo su dueño lo cambia: para cualquier otra persona, ese token no existe. */
  it('says it was not found when it is not one of the caller tokens', async () => {
    const service = createService(createRepository({ replaceAccess: () => Promise.resolve(null) }));

    const result = await service.updateAccess(worker, 'token-ajeno', readEverywhere);

    expect(result.getError().code).toBe('ACCESS_TOKEN_NOT_FOUND');
  });
});

describe('los tokens de todo el espacio de trabajo', () => {
  it('are listed only for whoever runs the workspace', async () => {
    const service = createService(createRepository());

    expect((await service.listWorkspaceTokens(worker)).getError().code).toBe('ACCESS_TOKEN_ADMIN_ONLY');
    expect((await service.listWorkspaceTokens(admin)).isOk()).toBe(true);
  });

  it('can be revoked only by whoever runs the workspace', async () => {
    const service = createService(createRepository());

    expect((await service.revokeWorkspaceToken(worker, 'token-a')).getError().code).toBe('ACCESS_TOKEN_ADMIN_ONLY');
    expect((await service.revokeWorkspaceToken(admin, 'token-a')).isOk()).toBe(true);
  });
});

describe('entrar con un token', () => {
  it('answers who it belongs to and what it holds, page rules included', async () => {
    const service = createService(
      createRepository({ findBySecretHash: () => Promise.resolve(withOwner({ access: readOnePage })) }),
    );

    const principal = await service.resolvePrincipal(someSecret);

    expect(principal).toEqual({
      access: readOnePage,
      role: USER_ROLE.WORKER,
      tokenId: 'token-a',
      userId: 'user-a',
      workspaceId: 'workspace-a',
    });
  });

  it('answers nobody for something that is not even shaped like a token, without asking the database', async () => {
    let asked = false;
    const service = createService(
      createRepository({
        findBySecretHash: () => {
          asked = true;
          return Promise.resolve(withOwner());
        },
      }),
    );

    expect(await service.resolvePrincipal('eyJhbGciOiJIUzI1NiJ9.a.b')).toBeNull();
    expect(await service.resolvePrincipal(`${someSecret}x`)).toBeNull();
    expect(asked).toBe(false);
  });

  it('answers nobody for a revoked token or an expired one', async () => {
    const revoked = createService(
      createRepository({
        findBySecretHash: () => Promise.resolve(withOwner({ revokedAt: new Date('2026-09-01T00:00:00.000Z') })),
      }),
    );
    const expired = createService(
      createRepository({
        findBySecretHash: () => Promise.resolve(withOwner({ expiresAt: new Date('2020-01-01T00:00:00.000Z') })),
      }),
    );

    expect(await revoked.resolvePrincipal(someSecret)).toBeNull();
    expect(await expired.resolvePrincipal(someSecret)).toBeNull();
  });

  /** Desactivar a una persona corta también a los agentes que actuaban por ella. */
  it('answers nobody when the person who owns it was deactivated', async () => {
    const service = createService(
      createRepository({
        findBySecretHash: () =>
          Promise.resolve(withOwner({ owner: { id: 'user-a', isActive: false, role: USER_ROLE.WORKER } })),
      }),
    );

    expect(await service.resolvePrincipal(someSecret)).toBeNull();
  });

  /** Anotar el último uso es un dato de consulta: si falla, se cuenta, y quien trajo el token igual entra. */
  it('lets the token in when its last use cannot be written down, and tells the log', async () => {
    const { entries, logger } = createLog();
    const service = createService(
      createRepository({
        findBySecretHash: () => Promise.resolve(withOwner()),
        touch: () => Promise.reject(new Error('The database is down')),
      }),
      logger,
    );

    expect(await service.resolvePrincipal(someSecret)).not.toBeNull();
    expect(entries.map((entry) => entry.message)).toEqual(['could not record the last use of an access token']);
  });
});

/** Quién creó, cambió o revocó un token queda en el log, sin el secreto ni nada que nombre a la persona. */
describe('lo que queda anotado de un token', () => {
  it('writes down a token created, its access replaced and its revoking, never its secret', async () => {
    const { entries, logger } = createLog();
    const service = createService(createRepository(), logger);

    const created = await service.createToken(worker, { access: readEverywhere, expiresAt: null, name: 'Bot' });
    await service.updateAccess(worker, 'token-a', readOnePage);
    await service.revokeToken(worker.userId, 'token-a');
    await service.revokeWorkspaceToken(admin, 'token-a');

    expect(entries.map((entry) => entry.message)).toEqual([
      'access token created',
      'access token access replaced',
      'access token revoked by its owner',
      'access token revoked by a workspace admin',
    ]);
    expect(entries[0]?.fields).toMatchObject({ allSpacesPermissions: [read], tokenId: 'token-a', userId: 'user-a' });
    expect(JSON.stringify(entries)).not.toContain(created.getValue().secret);
  });
});
