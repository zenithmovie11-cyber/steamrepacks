import { describe, expect, it } from 'vitest';
import { couponTotal, rewardSchema } from './checkout';

describe('configurable fixed coupon discount', () => {
  it('deducts the configured amount from the subtotal', () => {
    expect(couponTotal(500, 75)).toBe(425);
  });
  it('never makes the payable total negative', () => {
    expect(couponTotal(50, 75)).toBe(0);
  });
  it('keeps discounts disabled when the configured amount is zero', () => {
    expect(couponTotal(500, 0)).toBe(500);
  });
  it('rejects a negative discount setting', () => {
    expect(rewardSchema.safeParse({ discount_amount: -1, expires_at: null }).success).toBe(false);
  });
});