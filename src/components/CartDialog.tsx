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
  const [form, setForm] = useState<Form>({ full_name: "", phone: "", email: "", bkash_number: "", address: "", city: "" });

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!/^01[3-9]\d{8}$/.test(form.phone) || !/^01[3-9]\d{8}$/.test(form.bkash_number)) { toast.error("Enter a valid 11-digit Bangladeshi number (01XXXXXXXXX)"); return; }
    setSaving(true);
    const { error } = await supabase.from("orders").insert({ ...Object.fromEntries(Object.entries(form).map(([k, v]) => [k, v.trim()])) as Form, post_ids: items.map((p) => p.id), total });
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    cart.clear();
    setStep("cart");
    onOpenChange(false);
    toast.success("Order saved. bKash payment will open here once bKash is connected.");
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
              <div className="flex justify-between border-t pt-3 font-semibold"><span>Total</span><span className="tabular-nums">৳{total}</span></div>
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
            <div className="flex justify-between border-t pt-3 font-semibold"><span>Total</span><span className="tabular-nums">৳{total}</span></div>
            <div className="flex gap-2"><Button type="button" variant="outline" onClick={() => setStep("cart")}>Back</Button><Button type="submit" className="flex-1" disabled={saving}>{saving ? "Saving…" : "Pay with bKash"}</Button></div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
