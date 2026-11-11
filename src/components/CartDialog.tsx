import { useState } from "react";
import { toast } from "sonner";
import { Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useCart, parsePrice } from "@/lib/cart";
import type { Post } from "@/lib/posts";
import { bestOffer, type Offer } from "@/lib/offers";
import type { CheckoutQuote } from '@/lib/checkout';

const fields = [
  ["full_name", "Full name", "text"],
  ["phone", "Phone number", "tel"],
  ["email", "Email", "email"],
  ["bkash_number", "bKash number", "tel"],
  ["address", "Address", "text"],
  ["city", "City", "text"],
] as const;
type Form = Record<(typeof fields)[number][0], string>;

export function CartDialog({ open, onOpenChange, posts, offers, signedIn, onSignIn }: { open: boolean; onOpenChange: (o: boolean) => void; posts: Post[]; offers: Offer[]; signedIn: boolean; onSignIn: () => void }) {
  const cart = useCart();
  const items = posts.filter((p) => cart.has(p.id) && p.is_paid);
  const priceOf = (p: Post) => { const base = parsePrice(p.price); return bestOffer(p.id, base, offers, Date.now())?.price ?? base; };
  const total = items.reduce((s, p) => s + priceOf(p), 0);
  const [step, setStep] = useState<"cart" | "info">("cart");
  const [saving, setSaving] = useState(false);
  const [coupon, setCoupon] = useState('');
  const [quote, setQuote] = useState<CheckoutQuote | null>(null);
  const [quoting, setQuoting] = useState(false);
  const [quoteKey, setQuoteKey] = useState('');
  const currentKey = JSON.stringify([items.map(p => p.id), total, coupon]);
  const validQuote = quoteKey === currentKey ? quote : null;
  const [form, setForm] = useState<Form>({ full_name: "", phone: "", email: "", bkash_number: "", address: "", city: "" });

  async function applyCoupon() {
    setQuoting(true);
    try {
      const { data, error } = await supabase.rpc('checkout_quote', { p_post_ids: items.map(p => p.id), p_coupon: coupon });
      if (error) throw error;
      setQuote(data as unknown as CheckoutQuote); setQuoteKey(currentKey);
      toast.success(coupon ? 'Coupon applied' : 'Total updated');
    } catch (e) { setQuote(null); toast.error(e instanceof Error ? e.message : 'Could not apply coupon'); }
    finally { setQuoting(false); }
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!/^01[3-9]\d{8}$/.test(form.phone) || !/^01[3-9]\d{8}$/.test(form.bkash_number)) { toast.error("Enter a valid 11-digit Bangladeshi number (01XXXXXXXXX)"); return; }
    setSaving(true);
    const { data: saved, error } = await supabase.from("orders").insert({ ...Object.fromEntries(Object.entries(form).map(([k, v]) => [k, v.trim()])) as Form, post_ids: items.map((p) => p.id), coupon_code: validQuote?.coupon ?? null }).select('id,total').single();
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    cart.clear();
    setStep("cart");
    setCoupon(''); setQuote(null);
    onOpenChange(false);
    toast.success(`Order saved · ৳${saved.total}. Payment is pending; no money has been charged.`);
  }

  return (
    <Dialog open={open} onOpenChange={(o) => { onOpenChange(o); if (!o) setStep("cart"); }}>
      <DialogContent className="max-h-[90vh] overflow-y-auto border sm:max-w-lg">
        <DialogHeader><DialogTitle>{step === "cart" ? "Your cart" : "Buyer information"}</DialogTitle></DialogHeader>
        {step === "cart" ? (
          items.length === 0 ? <p className="py-8 text-center text-sm text-muted-foreground">Your cart is empty.</p> : (
            <div className="space-y-3">
              {items.map((p) => (
                <div key={p.id} className="flex items-center gap-3 rounded-md border p-3">
                  <span className="flex-1 truncate text-sm font-medium">{p.title}</span>
                  <span className="text-sm tabular-nums">{priceOf(p) < parsePrice(p.price) && <s className="mr-1 text-muted-foreground">৳{parsePrice(p.price)}</s>}৳{priceOf(p)}</span>
                  <Button variant="ghost" size="icon" aria-label="Remove" onClick={() => cart.remove(p.id)}><Trash2 /></Button>
                </div>
              ))}
              {signedIn && <div className="flex gap-2"><Input aria-label="Coupon code" placeholder="Coupon code" value={coupon} onChange={e => setCoupon(e.target.value.toUpperCase())} maxLength={40} /><Button variant="outline" onClick={applyCoupon} disabled={quoting}>{quoting ? 'Checking…' : 'Apply'}</Button></div>}
              {validQuote && validQuote.discount > 0 && <div className="flex justify-between text-sm text-success"><span>Coupon discount</span><span>−৳{validQuote.discount}</span></div>}
              <div className="flex justify-between border-t pt-3 font-semibold"><span>Total</span><span className="tabular-nums">৳{validQuote?.total ?? total}</span></div>
              {signedIn ? <Button className="w-full" onClick={() => setStep("info")}>Buy now</Button> : <Button className="w-full" onClick={onSignIn}>Sign in to buy</Button>}
            </div>
          )
        ) : (
          <form onSubmit={submit} className="space-y-3">
            {fields.map(([k, label, type]) => (
              <div key={k} className="space-y-1.5">
                <Label htmlFor={k}>{label}</Label>
                <Input id={k} type={type} required maxLength={k === "address" ? 300 : 100} value={form[k]} onChange={(e) => setForm({ ...form, [k]: e.target.value })} placeholder={type === "tel" ? "01XXXXXXXXX" : undefined} />
              </div>
            ))}
            <div className="flex justify-between border-t pt-3 font-semibold"><span>Total</span><span className="tabular-nums">৳{validQuote?.total ?? total}</span></div>
            <div className="flex gap-2"><Button type="button" variant="outline" onClick={() => setStep("cart")}>Back</Button><Button type="submit" className="flex-1" disabled={saving}>{saving ? "Saving…" : "Place order"}</Button></div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
