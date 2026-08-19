'use client';

import { usePagesStart } from '@/modules/pages/hooks/use.pages.start';
import { PrimaryButton } from '@/shared/components/forms/primary-button';

interface IProps {
  readonly label: string;
  readonly spaceId: string;
}

/** Where a space offers its first page: the page is made and opened, not asked for in a form. */
export const StartPageButton = ({ label, spaceId }: IProps) => {
  const { isStarting, startPage } = usePagesStart();

  return (
    <PrimaryButton disabled={isStarting} onClick={() => startPage(spaceId)} type="button">
      {label}
    </PrimaryButton>
  );
};
