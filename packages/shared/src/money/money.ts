import { InvalidMoneyError } from './money.error.js';

const CLP_FORMATTER = new Intl.NumberFormat('es-CL', {
  currency: 'CLP',
  maximumFractionDigits: 0,
  style: 'currency',
});

export class Money {
  private constructor(private readonly pesos: number) {}

  static of(pesos: number): Money {
    if (!Number.isInteger(pesos)) {
      throw new InvalidMoneyError(`El monto debe ser un entero en pesos: ${String(pesos)}`);
    }
    if (pesos < 0) {
      throw new InvalidMoneyError(`El monto no puede ser negativo: ${String(pesos)}`);
    }
    return new Money(pesos);
  }

  static zero(): Money {
    return new Money(0);
  }

  toNumber(): number {
    return this.pesos;
  }

  add(other: Money): Money {
    return Money.of(this.pesos + other.pesos);
  }

  subtract(other: Money): Money {
    return Money.of(this.pesos - other.pesos);
  }

  multiply(factor: number): Money {
    return Money.of(Math.round(this.pesos * factor));
  }

  applyPercent(rate: number): Money {
    return Money.of(Math.round((this.pesos * rate) / 100));
  }

  equals(other: Money): boolean {
    return this.pesos === other.pesos;
  }

  format(): string {
    return CLP_FORMATTER.format(this.pesos);
  }
}
