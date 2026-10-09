'use client';

import type { UserRole } from '@company-brain/shared';
import { useState } from 'react';
import type { AccessTokenSpaceOption, CreatedAccessToken } from '../types/access-tokens.types';
import { AccessTokensCreateForm } from './access-tokens.create.form';
import { AccessTokensSecretPanel } from './access-tokens.secret.panel';

interface IProps {
  readonly mcpUrl: string;
  readonly role: UserRole;
  readonly spaces: readonly AccessTokenSpaceOption[];
  /** Los nombres de los tokens vivos de quien crea, para avisar antes de enviar si uno se repite. */
  readonly takenNames: readonly string[];
}

/**
 * Crear un token en su propia página: primero qué puede hacer, después el
 * token mismo, en el mismo lugar. El secreto queda solo en esta página
 * mientras está abierta; al salir se olvida, porque no se puede volver a pedir.
 */
export const AccessTokensCreatePanel = ({ mcpUrl, role, spaces, takenNames }: IProps) => {
  const [created, setCreated] = useState<CreatedAccessToken | null>(null);

  if (created !== null) return <AccessTokensSecretPanel mcpUrl={mcpUrl} secret={created.secret} />;
  return <AccessTokensCreateForm onCreated={setCreated} role={role} spaces={spaces} takenNames={takenNames} />;
};
