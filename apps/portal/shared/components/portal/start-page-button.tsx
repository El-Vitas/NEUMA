'use client';

import { PrimaryButton } from '@/shared/components/forms/primary-button';
import { StartPageMenu } from './start-page-menu';

interface IProps {
  readonly label: string;
  readonly spaceId: string;
}

/**
 * Where a space offers its first page.
 *
 * Se elige qué se está creando y ahí mismo se hace y se abre, sin un formulario
 * de por medio: lo único que se pregunta es de qué clase, que es lo que decide
 * con qué se abre la página.
 */
export const StartPageButton = ({ label, spaceId }: IProps) => (
  <StartPageMenu spaceId={spaceId}>
    <PrimaryButton type="button">{label}</PrimaryButton>
  </StartPageMenu>
);
