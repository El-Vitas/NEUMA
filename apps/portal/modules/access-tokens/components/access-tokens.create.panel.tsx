'use client';

import type { UserRole } from '@neuma/shared';
import { useState } from 'react';
import type { AccessTokenSpaceOption, CreatedAccessToken } from '../types/access-tokens.types';
import { AccessTokensCreateForm } from './access-tokens.create.form';
import { AccessTokensSecretPanel } from './access-tokens.secret.panel';

interface IProps {
  readonly mcpUrl: string;
  readonly role: UserRole;
  readonly spaces: readonly AccessTokenSpaceOption[];
  readonly takenNames: readonly string[];
}

/** The secret lives only while this page is open; it cannot be requested again. */
export const AccessTokensCreatePanel = ({ mcpUrl, role, spaces, takenNames }: IProps) => {
  const [created, setCreated] = useState<CreatedAccessToken | null>(null);

  if (created !== null) return <AccessTokensSecretPanel mcpUrl={mcpUrl} secret={created.secret} />;
  return <AccessTokensCreateForm onCreated={setCreated} role={role} spaces={spaces} takenNames={takenNames} />;
};
