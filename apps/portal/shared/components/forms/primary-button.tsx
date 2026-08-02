import { Slot } from 'radix-ui';
import type * as React from 'react';
import { cn } from '@/lib/utils';

import { BASE_BUTTON_CLASSES, VARIANT_CLASSES } from '@/shared/constants/forms.constants';

interface PrimaryButtonProps extends React.ComponentProps<'button'> {
  asChild?: boolean;
  variant?: 'primary' | 'secondary';
}

export const PrimaryButton = ({ className, variant = 'primary', asChild = false, ...props }: PrimaryButtonProps) => {
  const Comp = asChild ? Slot.Root : 'button';
  const variantKey = variant === 'primary' ? 'PRIMARY' : 'SECONDARY';
  return (
    <Comp
      className={cn(BASE_BUTTON_CLASSES, VARIANT_CLASSES[variantKey], className)}
      data-slot="primary-button"
      data-variant={variant}
      {...props}
    />
  );
};

export type { PrimaryButtonProps };
