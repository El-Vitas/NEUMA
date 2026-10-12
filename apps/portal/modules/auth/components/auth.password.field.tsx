'use client';

import { FormField } from '@/shared/components/ui/form-field';

interface IProps {
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
