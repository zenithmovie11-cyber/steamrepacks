import { describe, expect, it } from 'vitest';
import { ctaDefaults, ctaSchema, safeCtaLink } from './bottom-cta';

describe('Bottom CTA settings', () => {
  it('allows hiding the banner', () => { expect(ctaSchema.parse({ ...ctaDefaults, is_visible: false }).is_visible).toBe(false); });
  it('allows an omitted secondary button', () => { expect(ctaSchema.safeParse({ ...ctaDefaults, secondary_enabled: false, secondary_button_text: '', secondary_button_link: '' }).success).toBe(true); });
  it('requires a valid link when secondary button is enabled', () => { expect(ctaSchema.safeParse({ ...ctaDefaults, secondary_button_link: '' }).success).toBe(false); });
  it('supports left, center and right alignment only', () => { for (const alignment of ['left', 'center', 'right']) expect(ctaSchema.safeParse({ ...ctaDefaults, alignment }).success).toBe(true); expect(ctaSchema.safeParse({ ...ctaDefaults, alignment: 'diagonal' }).success).toBe(false); });
  it('rejects executable and off-origin protocol-relative links', () => { expect(safeCtaLink('javascript:alert(1)')).toBeNull(); expect(safeCtaLink('//example.com')).toBeNull(); expect(safeCtaLink('/\\example.com')).toBeNull(); });
  it('retains default offers and paid game actions', () => { expect(safeCtaLink(ctaDefaults.primary_button_link)).toBe('#special-offers'); expect(safeCtaLink(ctaDefaults.secondary_button_link)).toBe('#paid-games'); });
});