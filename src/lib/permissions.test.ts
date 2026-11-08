import { describe, it, expect } from 'vitest';
import { canAccess } from './permissions';
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
});