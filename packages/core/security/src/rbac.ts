export type Role = 'admin' | 'builder' | 'operator' | 'partner' | 'viewer' | 'exec';

export interface Permission {
  resource: string;
  actions: ('create' | 'read' | 'update' | 'delete' | 'execute' | 'admin')[];
}

const ROLE_PERMISSIONS: Record<Role, Permission[]> = {
  admin: [
    { resource: '*', actions: ['create', 'read', 'update', 'delete', 'execute', 'admin'] },
  ],
  builder: [
    { resource: 'workflows', actions: ['create', 'read', 'update', 'delete', 'execute'] },
    { resource: 'nodes', actions: ['create', 'read', 'update'] },
    { resource: 'tracks', actions: ['create', 'read', 'update'] },
    { resource: 'experiments', actions: ['create', 'read', 'update', 'execute'] },
    { resource: 'ai', actions: ['create', 'read', 'execute'] },
    { resource: 'analytics', actions: ['read'] },
  ],
  operator: [
    { resource: 'workflows', actions: ['read', 'execute'] },
    { resource: 'tracks', actions: ['read', 'update'] },
    { resource: 'catalog', actions: ['read', 'update'] },
    { resource: 'rights', actions: ['read', 'update'] },
    { resource: 'analytics', actions: ['read'] },
    { resource: 'incidents', actions: ['create', 'read', 'update'] },
    { resource: 'health', actions: ['read'] },
  ],
  partner: [
    { resource: 'tracks', actions: ['read'] },
    { resource: 'catalog', actions: ['read'] },
    { resource: 'analytics', actions: ['read'] },
    { resource: 'rights', actions: ['read'] },
    { resource: 'api', actions: ['read', 'execute'] },
  ],
  viewer: [
    { resource: 'tracks', actions: ['read'] },
    { resource: 'catalog', actions: ['read'] },
    { resource: 'analytics', actions: ['read'] },
    { resource: 'workflows', actions: ['read'] },
  ],
  exec: [
    { resource: 'analytics', actions: ['read'] },
    { resource: 'kpi', actions: ['read'] },
    { resource: 'forecasts', actions: ['read'] },
    { resource: 'narratives', actions: ['read'] },
    { resource: 'experiments', actions: ['read'] },
    { resource: 'health', actions: ['read'] },
  ],
};

export class RbacService {
  checkPermission(
    userRoles: Role[],
    resource: string,
    action: 'create' | 'read' | 'update' | 'delete' | 'execute' | 'admin',
  ): boolean {
    for (const role of userRoles) {
      const perms = ROLE_PERMISSIONS[role];
      if (!perms) continue;

      for (const perm of perms) {
        if (perm.resource === '*' || perm.resource === resource) {
          if (perm.actions.includes(action) || perm.actions.includes('admin')) {
            return true;
          }
        }
      }
    }
    return false;
  }

  getPermissionsForRole(role: Role): Permission[] {
    return ROLE_PERMISSIONS[role] ?? [];
  }

  getAllRoles(): Role[] {
    return Object.keys(ROLE_PERMISSIONS) as Role[];
  }

  hasRole(userRoles: Role[], required: Role): boolean {
    return userRoles.includes(required);
  }

  hasAnyRole(userRoles: Role[], required: Role[]): boolean {
    return required.some((r) => userRoles.includes(r));
  }
}
