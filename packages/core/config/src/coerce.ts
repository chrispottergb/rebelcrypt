import type { AnyField } from './schema';

/**
 * Result of attempting to coerce a single raw string into a typed value.
 */
export type CoerceResult =
  | { readonly ok: true; readonly value: string | number | boolean }
  | { readonly ok: false; readonly reason: string };

const TRUTHY = new Set(['1', 'true', 'yes', 'y', 'on']);
const FALSY = new Set(['0', 'false', 'no', 'n', 'off']);

function coerceString(
  raw: string,
  field: Extract<AnyField, { kind: 'string' }>,
): CoerceResult {
  if (field.minLength !== undefined && raw.length < field.minLength) {
    return {
      ok: false,
      reason: `expected at least ${field.minLength} characters, got ${raw.length}`,
    };
  }
  if (field.pattern !== undefined && !field.pattern.test(raw)) {
    return { ok: false, reason: `does not match ${String(field.pattern)}` };
  }
  return { ok: true, value: raw };
}

function coerceNumber(
  raw: string,
  field: Extract<AnyField, { kind: 'number' }>,
): CoerceResult {
  const trimmed = raw.trim();
  if (trimmed === '') {
    return { ok: false, reason: 'expected a number but value was empty' };
  }
  const value = Number(trimmed);
  if (!Number.isFinite(value)) {
    return { ok: false, reason: `"${raw}" is not a finite number` };
  }
  if (field.integer && !Number.isInteger(value)) {
    return { ok: false, reason: `expected an integer, got ${value}` };
  }
  if (field.min !== undefined && value < field.min) {
    return { ok: false, reason: `expected >= ${field.min}, got ${value}` };
  }
  if (field.max !== undefined && value > field.max) {
    return { ok: false, reason: `expected <= ${field.max}, got ${value}` };
  }
  return { ok: true, value };
}

function coerceBoolean(raw: string): CoerceResult {
  const normalized = raw.trim().toLowerCase();
  if (TRUTHY.has(normalized)) {
    return { ok: true, value: true };
  }
  if (FALSY.has(normalized)) {
    return { ok: true, value: false };
  }
  return {
    ok: false,
    reason: `"${raw}" is not a recognized boolean (use one of: ${[...TRUTHY, ...FALSY].join(', ')})`,
  };
}

function coerceEnum(
  raw: string,
  field: Extract<AnyField, { kind: 'enum' }>,
): CoerceResult {
  if ((field.values as readonly string[]).includes(raw)) {
    return { ok: true, value: raw };
  }
  return {
    ok: false,
    reason: `"${raw}" is not one of: ${field.values.join(', ')}`,
  };
}

/**
 * Coerce and validate a raw string against a field definition.
 */
export function coerceValue(raw: string, field: AnyField): CoerceResult {
  switch (field.kind) {
    case 'string':
      return coerceString(raw, field);
    case 'number':
      return coerceNumber(raw, field);
    case 'boolean':
      return coerceBoolean(raw);
    case 'enum':
      return coerceEnum(raw, field);
    default: {
      // Exhaustiveness guard.
      const never: never = field;
      return { ok: false, reason: `unsupported field kind: ${String(never)}` };
    }
  }
}
