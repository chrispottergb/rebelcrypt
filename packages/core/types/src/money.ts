/**
 * Money / currency primitives. Monetary amounts are represented as integer
 * minor units (e.g. cents) to avoid floating-point rounding errors.
 */

import type { Brand } from './utility';

/** ISO-4217 three-letter currency code, e.g. `USD`, `EUR`, `JPY`. */
export type CurrencyCode = Brand<string, 'CurrencyCode'>;

/** A small, non-exhaustive catalogue of frequently used currencies. */
export const CURRENCIES = [
  'USD',
  'EUR',
  'GBP',
  'JPY',
  'CNY',
  'KRW',
  'BRL',
  'INR',
  'NGN',
  'ZAR',
] as const;
export type KnownCurrency = (typeof CURRENCIES)[number];

/** Number of decimal places for currencies that do not use 2. */
const NON_DEFAULT_FRACTION_DIGITS: Readonly<Record<string, number>> = {
  JPY: 0,
  KRW: 0,
  BHD: 3,
  KWD: 3,
};

/** Fraction digits (minor-unit exponent) for a given currency. */
export const fractionDigits = (currency: CurrencyCode | string): number =>
  NON_DEFAULT_FRACTION_DIGITS[currency] ?? 2;

/**
 * An immutable monetary value. `amountMinor` is an integer count of the
 * currency's smallest unit (e.g. 1099 = $10.99 in USD).
 */
export interface Money {
  readonly amountMinor: number;
  readonly currency: CurrencyCode;
}

/** Validate and brand a currency code (must be three uppercase letters). */
export const currencyCode = (code: string): CurrencyCode => {
  if (!/^[A-Z]{3}$/.test(code)) {
    throw new RangeError(`Invalid ISO-4217 currency code: "${code}"`);
  }
  return code as CurrencyCode;
};

/** Construct a Money value from integer minor units. */
export const money = (
  amountMinor: number,
  currency: CurrencyCode | string,
): Money => {
  if (!Number.isInteger(amountMinor)) {
    throw new RangeError(
      `Money.amountMinor must be an integer, got ${amountMinor}`,
    );
  }
  return {
    amountMinor,
    currency:
      typeof currency === 'string' ? currencyCode(currency) : currency,
  };
};

/** Construct a Money value from a major-unit decimal (e.g. dollars). */
export const moneyFromMajor = (
  amountMajor: number,
  currency: CurrencyCode | string,
): Money => {
  const code = typeof currency === 'string' ? currencyCode(currency) : currency;
  const factor = 10 ** fractionDigits(code);
  return money(Math.round(amountMajor * factor), code);
};

/** Ensure two Money values share a currency before arithmetic. */
const assertSameCurrency = (a: Money, b: Money): void => {
  if (a.currency !== b.currency) {
    throw new TypeError(
      `Currency mismatch: ${a.currency} vs ${b.currency}`,
    );
  }
};

/** Add two same-currency Money values. */
export const addMoney = (a: Money, b: Money): Money => {
  assertSameCurrency(a, b);
  return money(a.amountMinor + b.amountMinor, a.currency);
};

/** Subtract `b` from `a` (same currency). */
export const subtractMoney = (a: Money, b: Money): Money => {
  assertSameCurrency(a, b);
  return money(a.amountMinor - b.amountMinor, a.currency);
};

/** Render Money as a localized string using `Intl.NumberFormat`. */
export const formatMoney = (value: Money, locale = 'en-US'): string =>
  new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: value.currency,
  }).format(value.amountMinor / 10 ** fractionDigits(value.currency));
