import { describe, expect, it } from 'bun:test';
import { render, screen } from '@testing-library/react';
import { FormActions } from '@/shared/components/forms/form-actions';

const positionOf = (name: string): number => {
  const row = screen.getByRole('button', { name }).closest('div');
  if (row === null) throw new Error(`"${name}" is not inside the actions row`);
  return Array.from(row.parentElement?.children ?? []).indexOf(row);
};

describe('where a screen puts its actions', () => {
  it('puts what goes back before what moves forward, so it reads left to right', () => {
    render(
      <FormActions back={<button type="button">Volver</button>}>
        <button type="button">Crear página</button>
      </FormActions>,
    );

    expect(positionOf('Volver')).toBeLessThan(positionOf('Crear página'));
  });

  it('keeps the forward action at the end of the line even with nothing to go back to', () => {
    const { container } = render(
      <FormActions>
        <button type="button">Crear página</button>
      </FormActions>,
    );

    expect(container.firstElementChild?.className).toContain('justify-between');
    expect(positionOf('Crear página')).toBe(1);
  });

  it('stacks the forward action first on a narrow screen', () => {
    const { container } = render(
      <FormActions back={<button type="button">Volver</button>}>
        <button type="button">Crear página</button>
      </FormActions>,
    );

    expect(container.firstElementChild?.className).toContain('flex-col-reverse');
  });
});
