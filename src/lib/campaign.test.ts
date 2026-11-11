import { expect, it } from 'vitest';
import { campaignHtml, campaignSchema } from './campaign';

it('only allows HTTPS campaign links', () => {
  expect(campaignSchema.safeParse({ subject: 'Sale', message: 'Offer', button: 'Shop', url: 'javascript:alert(1)' }).success).toBe(false);
});
it('escapes user text in downloadable campaign content', () => {
  expect(campaignHtml({ subject: '<script>', message: '<img onerror=x>', button: '', url: '' })).toContain('&lt;img onerror=x&gt;');
});