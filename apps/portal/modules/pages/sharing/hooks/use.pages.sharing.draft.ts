'use client';

import type { BlockRole } from '@neuma/shared';
import { useState } from 'react';
import { PAGE_SHARING_NO_ENTRIES } from '../constants/pages.sharing.constants';
import {
  addMemberEntry,
  isDraftChanged,
  readDraftVerdict,
  readInitialDraft,
  readStartingEntries,
  removeEntry,
  setEntryRole,
} from '../lib/pages.sharing.lib';
import type {
  BlockAccess,
  SharingDraft,
  SharingEntry,
  SharingMember,
  SharingPrincipal,
} from '../types/pages.sharing.types';

/** What the dialog would save, how it differs from what is stored, and what it costs the person asking. */
export const usePagesSharingDraft = (access: BlockAccess) => {
  const [draft, setDraft] = useState<SharingDraft>(() => readInitialDraft(access));
  const entries = draft.kind === 'own' ? draft.entries : PAGE_SHARING_NO_ENTRIES;

  const changeEntries = (change: (current: readonly SharingEntry[]) => SharingEntry[]): void =>
    setDraft((current) => (current.kind === 'own' ? { entries: change(current.entries), kind: 'own' } : current));

  return {
    addMember: (member: SharingMember, role: BlockRole): void =>
      changeEntries((current) => addMemberEntry(current, member, role)),
    changeRole: (principal: SharingPrincipal, role: BlockRole): void =>
      changeEntries((current) => setEntryRole(current, principal, role)),
    draft,
    entries,
    isChanged: isDraftChanged(access, draft),
    removeEntry: (principal: SharingPrincipal): void => changeEntries((current) => removeEntry(current, principal)),
    resumeInheriting: (): void => setDraft({ kind: 'inherit' }),
    stopInheriting: (): void => setDraft({ entries: readStartingEntries(access), kind: 'own' }),
    verdict: readDraftVerdict(access, draft),
  };
};
