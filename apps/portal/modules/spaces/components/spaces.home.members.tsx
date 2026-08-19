import { useTranslations } from 'next-intl';
import type { SpaceMember } from '@/shared/types/space-members.types';
import { SPACE_HOME_MEMBERS_LIMIT } from '../constants/spaces.home.constants';

interface IProps {
  readonly members: readonly SpaceMember[];
}

/** Who is in the space, named rather than counted: a number does not tell one who to ask. */
export const SpacesHomeMembers = ({ members }: IProps) => {
  const t = useTranslations('spaces.home');

  if (members.length === 0) return <p className="text-muted-foreground text-sm">{t('noMembers')}</p>;

  const shown = members.slice(0, SPACE_HOME_MEMBERS_LIMIT);
  const rest = members.length - shown.length;

  return (
    <ul aria-label={t('members')} className="flex flex-wrap gap-2">
      {shown.map((member) => (
        <li className="border border-border bg-card px-3 py-1.5 text-sm" key={member.id}>
          {member.name}
        </li>
      ))}
      {rest > 0 && <li className="px-3 py-1.5 text-muted-foreground text-sm">{t('moreMembers', { count: rest })}</li>}
    </ul>
  );
};
