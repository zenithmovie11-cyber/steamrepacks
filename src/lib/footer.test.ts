import { describe, it, expect } from 'vitest';
import { footerDefaults, footerSchema, safeFooterUrl, footerCopyright } from './footer';
import { canAccess } from './permissions';
describe('Footer rules', () => {
  it('keeps footer management independent from newsletter management', () => {
    expect(canAccess(['newsletter.manage'], 'footer.manage')).toBe(false);
    expect(canAccess(['footer.manage'], 'footer.manage')).toBe(true);
  });
  it('rejects executable and protocol-relative navigation links', () => {
    expect(safeFooterUrl.safeParse('javascript:alert(1)').success).toBe(false);
    expect(safeFooterUrl.safeParse('//example.com').success).toBe(false);
    expect(safeFooterUrl.safeParse('https://example.com').success).toBe(true);
  });
  it('requires unique policy addresses', () => {
    const policy = { slug: 'privacy', title: 'Privacy', content: 'Our privacy policy' };
    expect(footerSchema.safeParse({ ...footerDefaults, policies: [policy, policy] }).success).toBe(false);
  });
  it('substitutes the copyright year', () => { expect(footerCopyright('© {year} Store', 2026)).toBe('© 2026 Store'); });
});