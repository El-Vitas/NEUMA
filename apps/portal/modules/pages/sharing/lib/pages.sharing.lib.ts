import {
  BLOCK_PRINCIPAL_KIND,
  BLOCK_ROLE,
  BLOCK_ROLE_VALUES,
  type BlockPermissionEntry,
  type BlockRole,
  holdsFullBlockAccess,
  isBlockManageable,
  resolveBlockRole,
  USER_ROLE,
  WORKSPACE_CAPABILITY_BY_ROLE,
} from '@neuma/shared';
import {
  PAGE_SHARING_ASSIGNABLE_ROLES,
  PAGE_SHARING_DECLARING_BLOCK_ID,
  PAGE_SHARING_DEFAULT_ROLE,
  PAGE_SHARING_SPACE_FALLBACK_ROLE,
  PAGE_SHARING_SPACE_ROLES,
} from '../constants/pages.sharing.constants';
import type {
  BlockAccess,
  SharingAssessmentInput,
  SharingChange,
  SharingDraft,
  SharingEntry,
  SharingMember,
  SharingPrincipal,
  SharingRestrictableBlock,
  SharingSource,
  SharingVerdict,
} from '../types/pages.sharing.types';

/** The blocks of a page, other than the page itself, that declare their own access. */
export const listRestrictedBlockIds = (
  blocks: readonly SharingRestrictableBlock[] | null | undefined,
  pageId: string,
): ReadonlySet<string> =>
  new Set(
    (blocks ?? [])
      .filter((block) => block.alive && block.hasOwnPermissions === true && block.id !== pageId)
      .map((block) => block.id),
  );

export const updateRestrictedBlockIds = (current: ReadonlySet<string>, change: SharingChange): ReadonlySet<string> => {
  const next = new Set(current);
  if (change.hasOwnPermissions) next.add(change.blockId);
  else next.delete(change.blockId);
  return next;
};

/** A block above may have no title of its own; a page says it is untitled, anything else is just "a section". */
export const nameSharingSource = (source: SharingSource, untitledPage: string, unnamedBlock: string): string => {
  if (source.title !== '') return source.title;
  return source.type === 'page' ? untitledPage : unnamedBlock;
};

export const toPermissionEntries = (entries: readonly SharingEntry[]): BlockPermissionEntry[] =>
  entries.map(({ principal, role }) => ({ principal, role }));

const isSamePrincipal = (first: SharingPrincipal, second: SharingPrincipal): boolean =>
  first.kind === BLOCK_PRINCIPAL_KIND.space
    ? second.kind === BLOCK_PRINCIPAL_KIND.space
    : second.kind === BLOCK_PRINCIPAL_KIND.user && second.userId === first.userId;

const isClient = (member: SharingMember): boolean => WORKSPACE_CAPABILITY_BY_ROLE[member.workspaceRole] === 'viewer';

/** A client is held below editing whatever is written, so the dialog offers it only reading. */
export const listAssignableRoles = (member: SharingMember): readonly BlockRole[] =>
  isClient(member) ? [BLOCK_ROLE.reader] : PAGE_SHARING_ASSIGNABLE_ROLES;

const listOfferedRoles = (principal: SharingPrincipal, members: readonly SharingMember[]): readonly BlockRole[] => {
  if (principal.kind === BLOCK_PRINCIPAL_KIND.space) return PAGE_SHARING_SPACE_ROLES;
  const member = members.find((candidate) => candidate.id === principal.userId);
  return member === undefined ? PAGE_SHARING_ASSIGNABLE_ROLES : listAssignableRoles(member);
};

/** The roles one entry can take; the one it holds stays in the list so the control always shows what is stored. */
export const listRoleChoices = (entry: SharingEntry, members: readonly SharingMember[]): readonly BlockRole[] => {
  const offered = listOfferedRoles(entry.principal, members);
  return BLOCK_ROLE_VALUES.filter((role) => role === entry.role || offered.includes(role));
};

/** What a select hands back is text; this says whether it is one of the roles that were offered. */
export const isOfferedRole = (value: string, offered: readonly BlockRole[]): value is BlockRole =>
  offered.some((role) => role === value);

/** Editing, unless the person cannot be given it; then the most they can have. */
export const pickStartingRole = (member: SharingMember | undefined): BlockRole => {
  if (member === undefined) return PAGE_SHARING_DEFAULT_ROLE;
  const allowed = listAssignableRoles(member);
  return allowed.includes(PAGE_SHARING_DEFAULT_ROLE)
    ? PAGE_SHARING_DEFAULT_ROLE
    : (allowed.at(-1) ?? BLOCK_ROLE.reader);
};

export const readEntryKey = (entry: SharingEntry): string =>
  entry.principal.kind === BLOCK_PRINCIPAL_KIND.space ? 'space' : `user:${entry.principal.userId}`;

/** A verdict the person may go ahead with once they have read it. */
export const needsConfirmation = (verdict: SharingVerdict): boolean =>
  verdict === 'losesAccess' || verdict === 'losesManagement';

export const setEntryRole = (
  entries: readonly SharingEntry[],
  principal: SharingPrincipal,
  role: BlockRole,
): SharingEntry[] => entries.map((entry) => (isSamePrincipal(entry.principal, principal) ? { ...entry, role } : entry));

export const removeEntry = (entries: readonly SharingEntry[], principal: SharingPrincipal): SharingEntry[] =>
  entries.filter((entry) => !isSamePrincipal(entry.principal, principal));

export const addMemberEntry = (
  entries: readonly SharingEntry[],
  member: SharingMember,
  role: BlockRole,
): SharingEntry[] => {
  const principal: SharingPrincipal = { kind: BLOCK_PRINCIPAL_KIND.user, userId: member.id };
  if (entries.some((entry) => isSamePrincipal(entry.principal, principal))) return [...entries];
  const allowed = listAssignableRoles(member);
  const given = allowed.includes(role) ? role : (allowed.at(-1) ?? BLOCK_ROLE.reader);
  const user = { email: member.email, id: member.id, name: member.name };
  return [...entries, { principal, role: given, user }];
};

/** Who can still be added: not yet listed, and able to open the space the block lives in. */
export const listMembersToAdd = (
  members: readonly SharingMember[],
  entries: readonly SharingEntry[],
): SharingMember[] =>
  members.filter(
    (member) =>
      member.canReadSpace &&
      !entries.some((entry) =>
        isSamePrincipal(entry.principal, { kind: BLOCK_PRINCIPAL_KIND.user, userId: member.id }),
      ),
  );

const toUserEntry = (member: SharingMember, role: BlockRole): SharingEntry => ({
  principal: { kind: BLOCK_PRINCIPAL_KIND.user, userId: member.id },
  role,
  user: { email: member.email, id: member.id, name: member.name },
});

/** Admins keep full access, as the space gives them; everybody else keeps what the space gave them, up to editing. */
const buildSpaceDefaultEntries = (members: readonly SharingMember[]): SharingEntry[] => [
  ...members
    .filter((member) => member.canReadSpace && member.workspaceRole === USER_ROLE.ADMIN)
    .map((member) => toUserEntry(member, BLOCK_ROLE.full)),
  { principal: { kind: BLOCK_PRINCIPAL_KIND.space }, role: PAGE_SHARING_SPACE_FALLBACK_ROLE, user: null },
];

/** What stopping the inheritance copies as the block's own: the declaration above, or the space's default. */
export const readStartingEntries = (access: BlockAccess): SharingEntry[] =>
  access.inherited.source === null ? buildSpaceDefaultEntries(access.members) : [...access.inherited.entries];

/** What the block follows when it goes back to inheriting; null means no declaration above, so the space decides. */
export const readInheritedPermissions = (access: BlockAccess): BlockPermissionEntry[] | null =>
  access.inherited.source === null ? null : toPermissionEntries(access.inherited.entries);

export const readInitialDraft = (access: BlockAccess): SharingDraft =>
  access.isDeclaredHere ? { entries: [...access.entries], kind: 'own' } : { kind: 'inherit' };

/** What gets saved: null means the block follows what is above it. */
export const readDraftPermissions = (draft: SharingDraft): BlockPermissionEntry[] | null =>
  draft.kind === 'own' ? toPermissionEntries(draft.entries) : null;

export const isDraftChanged = (access: BlockAccess, draft: SharingDraft): boolean =>
  JSON.stringify(readDraftPermissions(draft)) !== JSON.stringify(readDraftPermissions(readInitialDraft(access)));

export const readDraftVerdict = (access: BlockAccess, draft: SharingDraft): SharingVerdict =>
  assessPermissionsChange({
    members: access.members,
    permissions: draft.kind === 'own' ? toPermissionEntries(draft.entries) : readInheritedPermissions(access),
    viewerId: access.viewerId,
  });

const readMemberRole = (member: SharingMember, permissions: readonly BlockPermissionEntry[] | null): BlockRole =>
  resolveBlockRole({
    canReadSpace: member.canReadSpace,
    chain: [{ id: PAGE_SHARING_DECLARING_BLOCK_ID, permissions: permissions === null ? null : [...permissions] }],
    viewer: { userId: member.id, workspaceRole: member.workspaceRole },
  });

/**
 * The same roles the server resolves, applied to the declaration that is about to be saved. A change after which
 * nobody holds full access cannot be undone from the screen, so it is stopped; one that only costs the viewer their
 * own access is allowed once someone else can give it back.
 */
export const assessPermissionsChange = ({ members, permissions, viewerId }: SharingAssessmentInput): SharingVerdict => {
  const viewer = members.find((member) => member.id === viewerId);
  if (viewer === undefined) return 'safe';
  if (holdsFullBlockAccess(viewer, permissions)) return 'safe';
  const others = members.filter((member) => member.id !== viewerId);
  if (!isBlockManageable(others, permissions)) return 'lockout';
  return readMemberRole(viewer, permissions) === BLOCK_ROLE.none ? 'losesAccess' : 'losesManagement';
};
