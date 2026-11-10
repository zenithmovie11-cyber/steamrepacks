export const permissionGroups = [
  { key: 'content', label: 'Content library' },
  { key: 'storefront', label: 'Storefront & marketing' },
  { key: 'customers', label: 'Customers' },
  { key: 'insights', label: 'Analytics & insights' },
  { key: 'security', label: 'Security & system' },
] as const;
export type PermissionGroup = typeof permissionGroups[number]['key'];

export const permissionItems = [
  { key: 'posts.create', label: 'Publish posts', group: 'content' },
  { key: 'posts.edit', label: 'Edit posts', group: 'content' },
  { key: 'posts.delete', label: 'Delete posts', group: 'content' },
  { key: 'slides.manage', label: 'Manage hero slides', group: 'storefront' },
  { key: 'offers.manage', label: 'Manage special offers', group: 'storefront' },
  { key: 'announcement.manage', label: 'Manage announcement bar', group: 'storefront' },
  { key: 'bottom_cta.manage', label: 'Manage bottom banner CTA', group: 'storefront' },
  { key: 'lookbooks.manage', label: 'Manage lookbook gallery', group: 'storefront' },
  { key: 'reviews.manage', label: 'Manage customer reviews', group: 'customers' },
  { key: 'overview.view', label: 'View overview & quick stats', group: 'insights' },
  { key: 'analytics.view', label: 'View analytics', group: 'insights' },
  { key: 'roles.manage', label: 'Manage roles & access', group: 'security' },
  { key: 'security.manage', label: 'Manage IP security & block', group: 'security' },
  { key: 'audit.view', label: 'Read security logs', group: 'security' },
] as const satisfies readonly { key: string; label: string; group: PermissionGroup }[];
export type Permission = typeof permissionItems[number]['key'];
export function canAccess(permissions: readonly string[], permission: Permission) {
  return permissions.includes(permission);
}
export function permissionsByGroup() {
  return permissionGroups.map(g => ({ ...g, items: permissionItems.filter(p => p.group === g.key) }));
}
export type AppRole = { id: string; name: string; permissions: Permission[]; is_system: boolean };
export type Assignment = { id: string; email: string; role_id: string; protected: boolean; joined: boolean; updated_at: string; last_sign_in_at: string | null };
export type SecurityData = { roles: AppRole[]; assignments: Assignment[] };
export type AuditEntry = { id: string; actor_email: string; action: string; target: string; details: { permissions?: string[]; role?: string; before?: { role_id?: string; name?: string } }; created_at: string };
