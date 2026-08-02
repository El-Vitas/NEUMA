'use client';

import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { useInView } from '@/shared/hooks/useInView';

interface ScrollRevealProps {
  children: ReactNode;
  className?: string;
  delay?: number;
  direction?: 'bottom' | 'left' | 'right' | 'fade';
}

const directionClasses = {
  bottom: 'opacity-0 translate-y-8',
  left: 'opacity-0 -translate-x-8',
  right: 'opacity-0 translate-x-8',
  fade: 'opacity-0',
};

const animateClasses = {
  bottom: 'animate-in fade-in slide-in-from-bottom-5 duration-500',
  left: 'animate-in fade-in slide-in-from-left-5 duration-500',
  right: 'animate-in fade-in slide-in-from-right-5 duration-500',
  fade: 'animate-in fade-in duration-500',
};

const ScrollReveal = ({ children, className, delay = 0, direction = 'bottom' }: ScrollRevealProps) => {
  const { ref, isInView } = useInView({ once: true, threshold: 0.1 });

  return (
    <div
      className={cn(directionClasses[direction], isInView && animateClasses[direction], className)}
      ref={ref}
      style={{
        transitionDelay: `${delay}ms`,
      }}
    >
      {children}
    </div>
  );
};

export { ScrollReveal };
