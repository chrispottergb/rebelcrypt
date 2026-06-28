/**
 * Geographic and localization primitives: ISO country codes, language codes,
 * locales, and territories used for rights/licensing scoping.
 */

import type { Brand } from './utility';

/** ISO-3166-1 alpha-2 country code, e.g. `US`, `GB`, `JP`. */
export type CountryCode = Brand<string, 'CountryCode'>;

/** ISO-639-1 two-letter language code, e.g. `en`, `es`, `ja`. */
export type LanguageCode = Brand<string, 'LanguageCode'>;

/** BCP-47 locale tag, e.g. `en-US`, `pt-BR`. */
export type Locale = Brand<string, 'Locale'>;

/** Validate and brand an ISO-3166-1 alpha-2 country code. */
export const countryCode = (code: string): CountryCode => {
  if (!/^[A-Z]{2}$/.test(code)) {
    throw new RangeError(`Invalid ISO-3166-1 alpha-2 country code: "${code}"`);
  }
  return code as CountryCode;
};

/** Validate and brand an ISO-639-1 language code. */
export const languageCode = (code: string): LanguageCode => {
  if (!/^[a-z]{2}$/.test(code)) {
    throw new RangeError(`Invalid ISO-639-1 language code: "${code}"`);
  }
  return code as LanguageCode;
};

/** Compose a BCP-47 locale from a language and an optional country. */
export const locale = (
  language: LanguageCode | string,
  country?: CountryCode | string,
): Locale => {
  const lang = languageCode(String(language).toLowerCase());
  if (country === undefined) {
    return lang as unknown as Locale;
  }
  const region = countryCode(String(country).toUpperCase());
  return `${lang}-${region}` as Locale;
};

/**
 * A licensing / distribution territory. Either the special `WORLD` scope or an
 * explicit set of countries, optionally with exclusions.
 */
export interface Territory {
  /** Stable identifier for the territory definition. */
  readonly id: string;
  /** Human-friendly label, e.g. "European Union". */
  readonly name: string;
  /** When true, covers every country except those in `excludes`. */
  readonly worldwide: boolean;
  /** Explicit member countries (ignored when `worldwide` is true). */
  readonly includes: ReadonlyArray<CountryCode>;
  /** Countries carved out of the territory. */
  readonly excludes: ReadonlyArray<CountryCode>;
}

/** A territory covering the entire world. */
export const WORLD: Territory = {
  id: 'WORLD',
  name: 'Worldwide',
  worldwide: true,
  includes: [],
  excludes: [],
};

/** Determine whether a country falls within a territory. */
export const territoryContains = (
  territory: Territory,
  country: CountryCode,
): boolean => {
  if (territory.excludes.includes(country)) {
    return false;
  }
  return territory.worldwide || territory.includes.includes(country);
};
