import { describe, it, expect } from 'vitest';
import { subscribeEmailSchema, subscribersCsv, subscribeMessage, couponSchema, type Subscriber } from './newsletter';

describe('newsletter signup', () => {
  it('saves emails in lowercase without spaces so duplicates match', () => {
    expect(subscribeEmailSchema.parse('  Rahim@Example.COM ')).toBe('rahim@example.com');
  });
  it('rejects addresses that are not emails', () => {
    expect(subscribeEmailSchema.safeParse('rahim@').success).toBe(false);
    expect(subscribeEmailSchema.safeParse('not an email').success).toBe(false);
  });
  it('tells a returning subscriber they are already on the list', () => {
    expect(subscribeMessage({ result: 'already', coupon: null }, 'Thanks!')).toMatch(/already subscribed/);
    expect(subscribeMessage({ result: 'subscribed', coupon: 'X' }, 'Thanks!')).toBe('Thanks!');
  });
  it('only accepts simple coupon codes', () => {
    expect(couponSchema.safeParse('EID2026').success).toBe(true);
    expect(couponSchema.safeParse('EID 20%').success).toBe(false);
  });
});

describe('subscriber CSV export', () => {
  const row: Subscriber = { id: '1', email: '=cmd@x.com', status: 'active', source: 'homepage', coupon_shown: true, created_at: '2026-11-11T04:00:00Z', unsubscribed_at: null };
  it('has a header row plus one line per subscriber', () => {
    expect(subscribersCsv([row, { ...row, id: '2', email: 'b@x.com' }]).split('\r\n')).toHaveLength(3);
  });
  it('stops spreadsheet formulas from running', () => {
    expect(subscribersCsv([row]).split('\r\n')[1]!.startsWith(`"'=cmd@x.com"`)).toBe(true);
  });
});
