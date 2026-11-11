import { z } from 'zod';

export const rewardSchema = z.object({
  discount_amount: z.coerce.number().finite().min(0).max(1000000),
  expires_at: z.string().datetime({ offset: true }).nullable(),
});
export type CheckoutQuote = { subtotal: number; discount: number; total: number; coupon: string | null };
export function couponTotal(subtotal: number, discount: number) {
  return Math.round(Math.max(0, subtotal - Math.max(0, discount)) * 100) / 100;
}