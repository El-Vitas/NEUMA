'use client';

import { useState } from 'react';
import type { PageEditorBlockConversion, PageEditorConversionRequest } from '../types/pages.editor.convert.types';

/**
 * Decides when a conversion may go straight through and when it has to be
 * asked about first, so every place that offers conversions warns the same way.
 */
export const usePagesEditorConversionRequest = (onConvert: (targetId: string) => void): PageEditorConversionRequest => {
  const [pending, setPending] = useState<PageEditorBlockConversion | null>(null);

  return {
    ask: (conversion) => {
      if (conversion.losesContent) setPending(conversion);
      else onConvert(conversion.id);
    },
    confirm: (targetId) => {
      setPending(null);
      onConvert(targetId);
    },
    dismiss: () => setPending(null),
    pending,
  };
};
