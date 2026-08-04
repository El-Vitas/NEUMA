'use client';

import { FormField } from '@/shared/components/ui/form-field';

interface IProps {
  readonly id: string;
  readonly label: string;
}

export const AuthPasswordField = ({ id, label }: IProps) => (
  <FormField id={id} label={label} minLength={8} name="password" placeholder="********" required type="password" />
);
