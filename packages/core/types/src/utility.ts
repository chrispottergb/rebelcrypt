/**
 * Reusable, framework-agnostic utility types used across the
 * Global Music AI Ecosystem. These have no runtime footprint.
 */

/**
 * Nominal-typing helper. Produces a "branded" version of a base type so that
 * structurally identical primitives (e.g. two `string` ids) are not assignable
 * to one another by accident.
 *
 * @example
 * type UserId = Brand<string, 'UserId'>;
 * type TenantId = Brand<string, 'TenantId'>;
 * const a: UserId = 'u_1' as UserId; // ok
 * const b: TenantId = a;             // type error
 */
export type Brand<T, TBrand extends string> = T & {
  readonly __brand: TBrand;
};

/** Extract the underlying primitive from a branded type. */
export type Unbrand<T> = T extends Brand<infer U, string> ? U : T;

/** Recursively make every property optional. */
export type DeepPartial<T> = T extends (infer U)[]
  ? DeepPartial<U>[]
  : T extends ReadonlyArray<infer U>
    ? ReadonlyArray<DeepPartial<U>>
    : T extends object
      ? { [K in keyof T]?: DeepPartial<T[K]> }
      : T;

/** Recursively make every property required. */
export type DeepRequired<T> = T extends (infer U)[]
  ? DeepRequired<U>[]
  : T extends object
    ? { [K in keyof T]-?: DeepRequired<T[K]> }
    : T;

/** Recursively mark every property as readonly. */
export type DeepReadonly<T> = T extends (infer U)[]
  ? ReadonlyArray<DeepReadonly<U>>
  : T extends object
    ? { readonly [K in keyof T]: DeepReadonly<T[K]> }
    : T;

/**
 * Require at least one of the specified keys to be present while keeping the
 * rest of the object intact.
 *
 * @example
 * type Contact = RequireAtLeastOne<{ email?: string; phone?: string }>;
 */
export type RequireAtLeastOne<
  T,
  Keys extends keyof T = keyof T,
> = Pick<T, Exclude<keyof T, Keys>> &
  {
    [K in Keys]-?: Required<Pick<T, K>> & Partial<Pick<T, Exclude<Keys, K>>>;
  }[Keys];

/**
 * Require exactly one of the specified keys (and forbid the others).
 */
export type RequireExactlyOne<
  T,
  Keys extends keyof T = keyof T,
> = Pick<T, Exclude<keyof T, Keys>> &
  {
    [K in Keys]-?: Required<Pick<T, K>> &
      Partial<Record<Exclude<Keys, K>, never>>;
  }[Keys];

/** Make the listed keys optional while leaving the rest unchanged. */
export type PartialBy<T, K extends keyof T> = Omit<T, K> &
  Partial<Pick<T, K>>;

/** Make the listed keys required while leaving the rest unchanged. */
export type RequiredBy<T, K extends keyof T> = Omit<T, K> &
  Required<Pick<T, K>>;

/** A value that may be `T` or a Promise resolving to `T`. */
export type Awaitable<T> = T | Promise<T>;

/** A value that may be a single `T` or an array of `T`. */
export type OneOrMany<T> = T | T[];

/** A plain JSON-serializable value. */
export type JsonPrimitive = string | number | boolean | null;
export type JsonValue =
  | JsonPrimitive
  | JsonValue[]
  | { [key: string]: JsonValue };
export type JsonObject = { [key: string]: JsonValue };

/** ISO-8601 timestamp string, e.g. `2026-06-28T12:00:00.000Z`. */
export type IsoDateTime = Brand<string, 'IsoDateTime'>;

/** Construct a current ISO-8601 timestamp. */
export const nowIso = (): IsoDateTime =>
  new Date().toISOString() as IsoDateTime;

/** Narrow an arbitrary `Date | string | number` into an `IsoDateTime`. */
export const toIso = (value: Date | string | number): IsoDateTime =>
  new Date(value).toISOString() as IsoDateTime;
