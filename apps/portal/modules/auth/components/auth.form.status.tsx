'use client';

import { Button } from '@/shared/components/ui/button';
import type { FormState } from '../types/auth.form.types';

interface IProps {
  readonly state: FormState;
  readonly isPending: boolean;
  readonly errorMessage: string;
  readonly submitLabel: string;
  readonly submittingLabel: string;
}

export const AuthFormStatus = ({ state, isPending, errorMessage, submitLabel, submittingLabel }: IProps) => (
  <>
    {(state.message !== '' || state.messageKey !== undefined) && (
      <p className="text-sm text-status-error">{errorMessage}</p>
    )}

    <Button className="mt-2 h-12 w-full" disabled={isPending} size="lg" type="submit" variant="primary">
      {isPending ? submittingLabel : submitLabel}
    </Button>
  </>
);
