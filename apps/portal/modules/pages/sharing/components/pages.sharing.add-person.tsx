'use client';

import type { BlockRole } from '@neuma/shared';
import { useTranslations } from 'next-intl';
import { useId, useState } from 'react';
import { Button } from '@/shared/components/ui/button';
import {
  PAGE_SHARING_ASSIGNABLE_ROLES,
  PAGE_SHARING_DEFAULT_ROLE,
  PAGE_SHARING_SELECT_CLASS,
} from '../constants/pages.sharing.constants';
import { isOfferedRole, listAssignableRoles, pickStartingRole } from '../lib/pages.sharing.lib';
import type { SharingMember } from '../types/pages.sharing.types';

interface IProps {
  readonly candidates: readonly SharingMember[];
  readonly onAdd: (member: SharingMember, role: BlockRole) => void;
}

export const PagesSharingAddPerson = ({ candidates, onAdd }: IProps) => {
  const t = useTranslations('pages.sharing');
  const personId = useId();
  const roleId = useId();
  const [chosenId, setChosenId] = useState('');
  const [chosenRole, setChosenRole] = useState<BlockRole>(PAGE_SHARING_DEFAULT_ROLE);
  const chosen = candidates.find((member) => member.id === chosenId);
  const choices: readonly BlockRole[] =
    chosen === undefined ? PAGE_SHARING_ASSIGNABLE_ROLES : listAssignableRoles(chosen);

  if (candidates.length === 0) return <p className="text-muted-foreground text-sm">{t('nobodyToAdd')}</p>;

  return (
    <fieldset className="space-y-2">
      <div className="flex flex-wrap items-end gap-2">
        <div className="min-w-40 flex-1 space-y-1">
          <label className="font-medium text-sm" htmlFor={personId}>
            {t('addPerson')}
          </label>
          <select
            className={PAGE_SHARING_SELECT_CLASS}
            id={personId}
            onChange={(event) => {
              setChosenId(event.target.value);
              setChosenRole(pickStartingRole(candidates.find((member) => member.id === event.target.value)));
            }}
            value={chosenId}
          >
            <option value="">{t('addPersonChoose')}</option>
            {candidates.map((member) => (
              <option key={member.id} value={member.id}>
                {member.name}
              </option>
            ))}
          </select>
        </div>
        <div className="w-36 space-y-1">
          <label className="sr-only" htmlFor={roleId}>
            {t('addPersonRole')}
          </label>
          <select
            className={PAGE_SHARING_SELECT_CLASS}
            disabled={chosen === undefined}
            id={roleId}
            onChange={(event) => {
              if (isOfferedRole(event.target.value, choices)) setChosenRole(event.target.value);
            }}
            value={chosenRole}
          >
            {choices.map((role) => (
              <option key={role} value={role}>
                {t(`roles.${role}`)}
              </option>
            ))}
          </select>
        </div>
        <Button
          className="min-h-11"
          disabled={chosen === undefined}
          onClick={() => {
            if (chosen === undefined) return;
            onAdd(chosen, chosenRole);
            setChosenId('');
          }}
          type="button"
          variant="outline"
        >
          {t('add')}
        </Button>
      </div>
      {chosen !== undefined && choices.length === 1 && (
        <p className="text-muted-foreground text-xs">{t('clientLimit')}</p>
      )}
    </fieldset>
  );
};
