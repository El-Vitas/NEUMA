'use client';

import { PrimaryButton } from '@/shared/components/forms/primary-button';
import { StartPageMenu } from './start-page-menu';

interface IProps {
  readonly label: string;
  readonly spaceId: string;
}

export const StartPageButton = ({ label, spaceId }: IProps) => (
  <StartPageMenu spaceId={spaceId}>
    <PrimaryButton type="button">{label}</PrimaryButton>
  </StartPageMenu>
);
