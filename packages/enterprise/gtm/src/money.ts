/**
 * Money utilities. All monetary values are integer minor units (e.g. cents)
 * paired with an ISO-4217 currency code. No floating point is used for
 * persisted amounts; rounding is performed explicitly at well-defined points.
 */

export type CurrencyCode = string;

export interface Money {
  /** Integer amount in the currency's minor units (e.g. cents for USD). */
  readonly amount: number;
  readonly currency: CurrencyCode;
}

export class CurrencyMismatchError extends Error {
  constructor(a: CurrencyCode, b: CurrencyCode) {
    super(`Currency mismatch: ${a} vs ${b}`);
    this.name = 'CurrencyMismatchError';
  }
}

export function money(amount: number, currency: CurrencyCode): Money {
  if (!Number.isFinite(amount)) {
    throw new RangeError(`Money amount must be finite, got ${amount}`);
  }
  return { amount: Math.trunc(amount), currency };
}

export function zero(currency: CurrencyCode): Money {
  return { amount: 0, currency };
}

function assertSameCurrency(a: Money, b: Money): void {
  if (a.currency !== b.currency) {
    throw new CurrencyMismatchError(a.currency, b.currency);
  }
}

export function add(a: Money, b: Money): Money {
  assertSameCurrency(a, b);
  return { amount: a.amount + b.amount, currency: a.currency };
}

export function subtract(a: Money, b: Money): Money {
  assertSameCurrency(a, b);
  return { amount: a.amount - b.amount, currency: a.currency };
}

export function sum(items: readonly Money[], currency: CurrencyCode): Money {
  return items.reduce((acc, m) => add(acc, m), zero(currency));
}

/**
 * Multiply a money amount by a (possibly fractional) factor, rounding the
 * result to the nearest minor unit using banker's-rounding-free half-up.
 */
export function scale(value: Money, factor: number): Money {
  if (!Number.isFinite(factor)) {
    throw new RangeError(`Scale factor must be finite, got ${factor}`);
  }
  return { amount: roundHalfUp(value.amount * factor), currency: value.currency };
}

/** Apply basis points (1/100 of a percent). 2500 bps = 25%. */
export function applyBasisPoints(value: Money, bps: number): Money {
  return scale(value, bps / 10_000);
}

export function isNegative(value: Money): boolean {
  return value.amount < 0;
}

export function clampNonNegative(value: Money): Money {
  return value.amount < 0 ? zero(value.currency) : value;
}

/** Deterministic half-up rounding that is symmetric around zero. */
export function roundHalfUp(n: number): number {
  return Math.sign(n) * Math.round(Math.abs(n));
}
