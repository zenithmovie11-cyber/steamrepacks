import { describe, it, expect } from 'vitest';
import { canAccess, permissionItems, permissionsByGroup } from './permissions';
describe('role permissions', () => {
  it('gives no privileges to an unassigned account', () => {
    expect(canAccess([], 'roles.manage')).toBe(false);
  });
  it('keeps publishing separate from deleting and role management', () => {
    expect(canAccess(['posts.create'], 'posts.create')).toBe(true);
    expect(canAccess(['posts.create'], 'posts.delete')).toBe(false);
    expect(canAccess(['posts.create'], 'roles.manage')).toBe(false);
  });
  it('requires explicit permission for security logs', () => {
    expect(canAccess(['roles.manage'], 'audit.view')).toBe(false);
    expect(canAccess(['audit.view'], 'audit.view')).toBe(true);
  });
  it('offers 16 permissions covering every admin section', () => {
    expect(permissionItems.map(p => p.key)).toEqual([
      'posts.create', 'posts.edit', 'posts.delete', 'slides.manage', 'offers.manage', 'announcement.manage',
      'bottom_cta.manage', 'lookbooks.manage', 'reviews.manage', 'newsletter.manage', 'footer.manage', 'overview.view', 'analytics.view',
      'roles.manage', 'security.manage', 'audit.view',
    ]);
  });
  it('places every permission in exactly one group', () => {
    expect(permissionsByGroup().flatMap(g => g.items).length).toBe(16);
  });
  it('keeps new section permissions independent of hero slides', () => {
    expect(canAccess(['slides.manage'], 'reviews.manage')).toBe(false);
    expect(canAccess(['slides.manage'], 'lookbooks.manage')).toBe(false);
    expect(canAccess(['roles.manage'], 'security.manage')).toBe(false);
    expect(canAccess(['reviews.manage'], 'newsletter.manage')).toBe(false);
  });
});
