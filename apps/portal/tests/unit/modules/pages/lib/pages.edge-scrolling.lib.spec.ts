import { describe, expect, it } from 'bun:test';
import { readEdgeScrollStep } from '@/modules/pages/collections/lib/pages.edge-scrolling.lib';

const bounds = { left: 100, right: 900 };

describe('desplazar contra el borde', () => {
  it('no desplaza mientras la mano está en el medio', () => {
    expect(readEdgeScrollStep(500, bounds)).toBe(0);
  });

  it('desplaza hacia la izquierda cerca del borde izquierdo', () => {
    expect(readEdgeScrollStep(110, bounds)).toBeLessThan(0);
  });

  it('desplaza hacia la derecha cerca del borde derecho', () => {
    expect(readEdgeScrollStep(890, bounds)).toBeGreaterThan(0);
  });

  /** Acercarse de a poco desplaza de a poco: si no, habría que retirar la mano para frenar. */
  it('va más rápido cuanto más pegado al borde', () => {
    expect(Math.abs(readEdgeScrollStep(105, bounds))).toBeGreaterThan(Math.abs(readEdgeScrollStep(160, bounds)));
  });

  /** Pasado el borde se sigue desplazando a tope y no más: la cuenta no se dispara. */
  it('no se pasa de la velocidad máxima aunque la mano salga del marco', () => {
    expect(readEdgeScrollStep(0, bounds)).toBe(readEdgeScrollStep(100, bounds));
    expect(readEdgeScrollStep(2000, bounds)).toBe(readEdgeScrollStep(900, bounds));
  });
});
