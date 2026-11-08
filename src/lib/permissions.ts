export const permissionItems = [
  { key: 'posts.create', label: 'Publish posts' },
  { key: 'posts.edit', label: 'Edit posts' },
  { key: 'posts.delete', label: 'Delete posts' },
  { key: 'slides.manage', label: 'Manage slides & settings' },
  { key: 'analytics.view', label: 'View analytics' },
  { key: 'overview.view', label: 'View overview' },
  { key: 'roles.manage', label: 'Manage roles & access' },
  { key: 'audit.view', label: 'Read security logs' },
] as const;
export type Permission = typeof permissionItems[number]['key'];
export function canAccess(permissions: readonly string[], permission: Permission) {
  return permissions.includes(permission);
}
export type AppRole = { id: string; name: string; permissions: Permission[]; is_system: boolean };
export type Assignment = { id: string; email: string; role_id: string; protected: boolean; joined: boolean; updated_at: string; last_sign_in_at: string | null };
export type SecurityData = { roles: AppRole[]; assignments: Assignment[] };
export type AuditEntry = { id: string; actor_email: string; action: string; target: string; details: { permissions?: string[]; role?: string; before?: { role_id?: string; name?: string } }; created_at: string };