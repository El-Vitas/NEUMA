'use client';

import { useCallback, useRef, useState } from 'react';

import type { UseInViewOptions } from './types/use-in-view.types';

const useInView = ({ threshold = 0.1, rootMargin = '0px', once = true }: UseInViewOptions = {}) => {
  const [isInView, setIsInView] = useState(false);
  const observerRef = useRef<IntersectionObserver | null>(null);

  const ref = useCallback(
    (element: HTMLElement | null) => {
      if (observerRef.current) {
        observerRef.current.disconnect();
        observerRef.current = null;
      }

      if (!element) {
        setIsInView(false);
        return;
      }

      const observer = new IntersectionObserver(
        ([entry]) => {
          if (entry.isIntersecting) {
            setIsInView(true);
            if (once) {
              observer.unobserve(element);
            }
          } else if (!once) {
            setIsInView(false);
          }
        },
        { threshold, rootMargin },
      );

      observer.observe(element);
      observerRef.current = observer;
    },
    [threshold, rootMargin, once],
  );

  return { ref, isInView };
};

export { useInView };
