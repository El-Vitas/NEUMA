import { describe, expect, it } from 'bun:test';
import { InvalidMoneyError } from './money.error.js';
import { Money } from './money.js';

describe('Money', () => {
  it('construye desde pesos enteros', () => {
    expect(Money.of(15000).toNumber()).toBe(15000);
  });

  it('rechaza negativos y no-enteros', () => {
    expect(() => Money.of(-1)).toThrow(InvalidMoneyError);
    expect(() => Money.of(10.5)).toThrow(InvalidMoneyError);
  });

  it('suma y resta', () => {
    expect(Money.of(1000).add(Money.of(500)).toNumber()).toBe(1500);
    expect(Money.of(1000).subtract(Money.of(400)).toNumber()).toBe(600);
  });

  it('resta que da negativo lanza', () => {
    expect(() => Money.of(100).subtract(Money.of(300))).toThrow(InvalidMoneyError);
  });

  it('multiplica por cantidad y redondea a CLP entero', () => {
    expect(Money.of(1000).multiply(2.5).toNumber()).toBe(2500);
    expect(Money.of(999).multiply(1.5).toNumber()).toBe(1499);
  });

  it('aplica porcentaje con redondeo', () => {
    expect(Money.of(10000).applyPercent(19).toNumber()).toBe(1900);
    expect(Money.of(999).applyPercent(19).toNumber()).toBe(190);
  });

  it('formatea como CLP', () => {
    expect(Money.of(15000).format()).toContain('15.000');
  });
});
