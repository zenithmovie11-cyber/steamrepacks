import { describe, expect, it } from 'vitest';
import { announcementDefaults, announcementSchema, dismissKey, isAnnouncementLive } from './announcement-bar';

const base = { ...announcementDefaults, is_enabled: true };
const now = new Date('2026-11-09T00:00:00Z').getTime();

describe('announcement bar', () => {
  it('hidden when disabled', () => expect(isAnnouncementLive({ ...base, is_enabled: false }, now)).toBe(false));
  it('hidden after expiry date', () => expect(isAnnouncementLive({ ...base, expires_at: '2026-11-08T00:00:00Z' }, now)).toBe(false));
  it('hidden before start date', () => expect(isAnnouncementLive({ ...base, starts_at: '2026-11-10T00:00:00Z' }, now)).toBe(false));
  it('shown inside schedule', () => expect(isAnnouncementLive({ ...base, starts_at: '2026-11-01T00:00:00Z', expires_at: '2026-11-30T00:00:00Z' }, now)).toBe(true));
  it('new message resets dismissal', () => expect(dismissKey(base)).not.toBe(dismissKey({ ...base, message: 'New' })));
  it('rejects unsafe links', () => expect(announcementSchema.safeParse({ ...base, link_url: 'javascript:alert(1)' }).success).toBe(false));
});
