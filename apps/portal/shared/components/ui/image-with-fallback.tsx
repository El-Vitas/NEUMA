'use client';

import { ImageOff } from 'lucide-react';
import Image, { type ImageProps } from 'next/image';
import { useState } from 'react';
import { cn } from '@/lib/utils';

interface IProps extends Omit<ImageProps, 'onError'> {
  readonly fallbackClassName?: string;
}

export const ImageWithFallback = ({ alt, className, fallbackClassName, ...props }: IProps) => {
  const [hasError, setHasError] = useState(false);

  if (hasError) {
    return (
      <div
        aria-label={typeof alt === 'string' && alt.length > 0 ? alt : 'Imagen no disponible'}
        className={cn('flex items-center justify-center bg-muted text-muted-foreground', className, fallbackClassName)}
        role="img"
      >
        <ImageOff aria-hidden="true" className="size-6" />
      </div>
    );
  }

  return <Image alt={alt} className={className} onError={() => setHasError(true)} {...props} />;
};
