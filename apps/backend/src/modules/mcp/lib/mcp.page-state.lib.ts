import { resolvePageVerificationStatus } from '@company-brain/shared';
import type { McpPage, McpPageState } from '../types/mcp.types';

const toDay = (moment: Date | null): string | null => (moment === null ? null : moment.toISOString().slice(0, 10));

/** Verification is compared against `now`, so an expired one is reported expired even if untouched since. */
export const describeMcpPageState = (page: McpPage, now: Date): McpPageState => ({
  locked: page.lockedAt !== null,
  owner: page.owner,
  verification: {
    by: page.verifiedBy,
    on: toDay(page.verifiedAt),
    status: resolvePageVerificationStatus(page.verifiedAt, page.verificationExpiresAt, now),
    until: toDay(page.verificationExpiresAt),
  },
});

const namePerson = (person: { readonly id: string; readonly name: string } | null): string =>
  person === null ? 'someone no longer in the workspace' : `${person.name} (${person.id})`;

const describeVerification = (verification: McpPageState['verification']): string => {
  const { by, on, status, until } = verification;
  const validUntil = until === null ? '' : `, valid until ${until}`;
  switch (status) {
    case 'VERIFIED':
      return `Verified by ${namePerson(by)} on ${on ?? '?'}${validUntil}.`;
    case 'EXPIRED':
      return `Verification expired on ${until ?? '?'} (${namePerson(by)} vouched for it on ${on ?? '?'}): it may be out of date.`;
    default:
      return 'Not verified.';
  }
};

export const formatMcpPageState = (state: McpPageState): string =>
  [
    describeVerification(state.verification),
    state.locked ? 'Locked: nobody can change it until someone unlocks it.' : '',
    state.owner === null ? '' : `Owner: ${namePerson(state.owner)}.`,
  ]
    .filter((line) => line !== '')
    .join('\n');
