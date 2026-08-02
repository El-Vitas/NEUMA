import * as LabelPrimitive from '@radix-ui/react-label';
import type { ComponentPropsWithoutRef, ComponentRef, Ref } from 'react';

import { cn } from '@/lib/utils';

type LabelProps = ComponentPropsWithoutRef<typeof LabelPrimitive.Root> & {
  ref?: Ref<ComponentRef<typeof LabelPrimitive.Root>>;
};

const Label = ({ className, ref, ...props }: LabelProps) => (
  <LabelPrimitive.Root
    className={cn(
      'font-medium text-sm leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70',
      className,
    )}
    ref={ref}
    {...props}
  />
);
Label.displayName = LabelPrimitive.Root.displayName;

export { Label };
