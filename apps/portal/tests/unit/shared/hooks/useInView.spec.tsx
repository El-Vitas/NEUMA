import { describe, expect, it, spyOn } from 'bun:test';
import { render } from '@testing-library/react';
import type { ReactElement } from 'react';
import { useInView } from '@/shared/hooks/useInView';

const ObservedElement = (): ReactElement => {
  const { ref } = useInView();
  return <div data-testid="observed" ref={ref} />;
};

describe('useInView', () => {
  it('disconnects the observer on unmount so it does not leak past the component lifecycle', () => {
    const disconnectSpy = spyOn(IntersectionObserver.prototype, 'disconnect');
    const { unmount } = render(<ObservedElement />);

    unmount();

    expect(disconnectSpy).toHaveBeenCalledTimes(1);
    disconnectSpy.mockRestore();
  });

  it('disconnects the previous observer before attaching to a newly rendered element', () => {
    const disconnectSpy = spyOn(IntersectionObserver.prototype, 'disconnect');
    const { rerender, unmount } = render(<ObservedElement key="a" />);

    rerender(<ObservedElement key="b" />);

    expect(disconnectSpy).toHaveBeenCalledTimes(1);

    unmount();
    expect(disconnectSpy).toHaveBeenCalledTimes(2);
    disconnectSpy.mockRestore();
  });
});
