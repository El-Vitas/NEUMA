import { Lock, LockKeyhole, Users } from 'lucide-react';
import type { SpaceVisibility } from '../types/spaces.types';

interface IProps {
  readonly visibility: SpaceVisibility;
}

/** The mark a space wears for how far it reaches: everyone, its invited few, or one person alone. */
export const SpacesVisibilityIcon = ({ visibility }: IProps) => {
  if (visibility === 'RESTRICTED') return <LockKeyhole aria-hidden="true" />;
  if (visibility === 'PRIVATE') return <Lock aria-hidden="true" />;
  return <Users aria-hidden="true" />;
};
