/**
 * Core identity & access domain types: Tenant, User, Role, and the
 * platform-wide AuditEvent shape.
 */

import type { Brand, IsoDateTime, JsonObject } from './utility';
import type { Environment, Severity, Visibility } from './enums';
import type { CountryCode, Locale } from './geo';

export type TenantId = Brand<string, 'TenantId'>;
export type UserId = Brand<string, 'UserId'>;
export type RoleId = Brand<string, 'RoleId'>;

/** Built-in, platform-recognized roles. Custom roles use arbitrary `RoleId`s. */
export const SystemRole = {
  Owner: 'owner',
  Admin: 'admin',
  Editor: 'editor',
  Analyst: 'analyst',
  Viewer: 'viewer',
} as const;
export type SystemRole = (typeof SystemRole)[keyof typeof SystemRole];

/** A permission expressed as `resource:action`, e.g. `track:publish`. */
export type Permission = Brand<string, 'Permission'>;

/** Construct a validated permission string. */
export const permission = (resource: string, action: string): Permission => {
  if (!/^[a-z0-9_]+$/.test(resource) || !/^[a-z0-9_*]+$/.test(action)) {
    throw new RangeError(
      `Invalid permission "${resource}:${action}" (expected resource:action)`,
    );
  }
  return `${resource}:${action}` as Permission;
};

/** A named bundle of permissions granted to users within a tenant. */
export interface Role {
  readonly id: RoleId;
  readonly tenantId: TenantId;
  readonly name: string;
  readonly system: boolean;
  readonly permissions: ReadonlyArray<Permission>;
  readonly createdAt: IsoDateTime;
}

/** Lifecycle status of a user account. */
export const UserStatus = {
  Invited: 'invited',
  Active: 'active',
  Suspended: 'suspended',
  Deactivated: 'deactivated',
} as const;
export type UserStatus = (typeof UserStatus)[keyof typeof UserStatus];

/** A person (or service principal) acting within one or more tenants. */
export interface User {
  readonly id: UserId;
  readonly tenantId: TenantId;
  readonly email: string;
  readonly displayName: string;
  readonly status: UserStatus;
  readonly roleIds: ReadonlyArray<RoleId>;
  readonly locale?: Locale;
  readonly country?: CountryCode;
  readonly createdAt: IsoDateTime;
  readonly lastSeenAt?: IsoDateTime;
}

/** Subscription / commercial tier of a tenant. */
export const TenantTier = {
  Free: 'free',
  Pro: 'pro',
  Enterprise: 'enterprise',
} as const;
export type TenantTier = (typeof TenantTier)[keyof typeof TenantTier];

/** A top-level organization that owns users, content, and configuration. */
export interface Tenant {
  readonly id: TenantId;
  readonly name: string;
  readonly slug: string;
  readonly tier: TenantTier;
  readonly environment: Environment;
  readonly defaultLocale: Locale;
  readonly visibility: Visibility;
  readonly featureFlags: Readonly<Record<string, boolean>>;
  readonly createdAt: IsoDateTime;
}

/** Identity of whoever (or whatever) initiated an audited action. */
export interface Actor {
  readonly kind: 'user' | 'service' | 'system';
  readonly id: string;
  readonly displayName?: string;
}

/**
 * An immutable record of a state-changing action, suitable for compliance and
 * security auditing.
 */
export interface AuditEvent {
  readonly id: string;
  readonly tenantId: TenantId;
  readonly occurredAt: IsoDateTime;
  readonly actor: Actor;
  /** Dotted action name, e.g. `track.published`. */
  readonly action: string;
  /** Type of the affected resource, e.g. `track`. */
  readonly targetType: string;
  readonly targetId: string;
  readonly severity: Severity;
  /** Whether the action succeeded. */
  readonly outcome: 'success' | 'failure';
  /** Source IP address, when known. */
  readonly sourceIp?: string;
  /** Arbitrary structured context (must be JSON-serializable). */
  readonly metadata?: JsonObject;
}
