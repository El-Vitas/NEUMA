import { describe, expect, it } from 'bun:test';
import { render, screen } from '@testing-library/react';
import { Slider } from '@/shared/components/ui/slider';

describe('Slider', () => {
  it('renders one thumb per value without remounting a focused thumb when its value changes', () => {
    const { rerender } = render(<Slider value={[20, 80]} />);

    const thumbs = screen.getAllByRole('slider');
    expect(thumbs).toHaveLength(2);
    thumbs[0]?.focus();
    expect(document.activeElement).toBe(thumbs[0]);

    rerender(<Slider value={[35, 80]} />);

    expect(document.activeElement).toBe(screen.getAllByRole('slider')[0]);
  });
});
