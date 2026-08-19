'use client';

import { FormField } from '@/shared/components/ui/form-field';

interface IProps {
  /** What the browser's password manager is being asked for: the stored password, or a place to invent one. */
  readonly autoComplete: 'current-password' | 'new-password';
  readonly id: string;
  readonly label: string;
}

export const AuthPasswordField = ({ autoComplete, id, label }: IProps) => (
  <FormField
    autoComplete={autoComplete}
    id={id}
    label={label}
    minLength={8}
    name="password"
    placeholder="********"
    required
    type="password"
  />
);
