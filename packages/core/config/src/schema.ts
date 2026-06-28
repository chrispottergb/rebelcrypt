/**
 * Supported primitive kinds a config field can coerce to.
 */
export type FieldKind = 'string' | 'number' | 'boolean' | 'enum';

/**
 * Maps a field kind to its resolved TypeScript type.
 * Enum fields narrow to the union of their declared choices.
 */
export type ResolvedFieldType<F> = F extends EnumField<infer V>
  ? V
  : F extends NumberField
    ? number
    : F extends BooleanField
      ? boolean
      : F extends StringField
        ? string
        : never;

interface BaseField<T> {
  readonly kind: FieldKind;
  /** The source key to read; defaults to the schema property name. */
  readonly env?: string;
  /** Default applied when the source value is absent. */
  readonly default?: T;
  /** When true (and no default), absence is an error. Defaults to true. */
  readonly required?: boolean;
  /** Optional human description, surfaced in error messages. */
  readonly description?: string;
}

export interface StringField extends BaseField<string> {
  readonly kind: 'string';
  /** Optional minimum length (inclusive). */
  readonly minLength?: number;
  /** Optional pattern the value must match. */
  readonly pattern?: RegExp;
}

export interface NumberField extends BaseField<number> {
  readonly kind: 'number';
  /** Require an integer value. */
  readonly integer?: boolean;
  readonly min?: number;
  readonly max?: number;
}

export interface BooleanField extends BaseField<boolean> {
  readonly kind: 'boolean';
}

export interface EnumField<V extends string = string> extends BaseField<V> {
  readonly kind: 'enum';
  readonly values: readonly V[];
}

export type AnyField =
  | StringField
  | NumberField
  | BooleanField
  | EnumField<string>;

/**
 * A schema is a record of field definitions keyed by config property name.
 */
export type Schema = Record<string, AnyField>;

/**
 * The strongly-typed config object produced from a schema.
 */
export type ConfigFromSchema<S extends Schema> = {
  readonly [K in keyof S]: ResolvedFieldType<S[K]>;
};

/**
 * Identity helper that preserves precise literal types (notably enum value
 * unions) for downstream inference. Use instead of declaring the object inline.
 */
export function defineSchema<S extends Schema>(schema: S): S {
  return schema;
}

/** Field factory helpers for ergonomic, type-safe schema authoring. */
export const f = {
  string(opts: Omit<StringField, 'kind'> = {}): StringField {
    return { kind: 'string', ...opts };
  },
  number(opts: Omit<NumberField, 'kind'> = {}): NumberField {
    return { kind: 'number', ...opts };
  },
  boolean(opts: Omit<BooleanField, 'kind'> = {}): BooleanField {
    return { kind: 'boolean', ...opts };
  },
  enum<V extends string>(
    values: readonly V[],
    opts: Omit<EnumField<V>, 'kind' | 'values'> = {},
  ): EnumField<V> {
    return { kind: 'enum', values, ...opts };
  },
} as const;
