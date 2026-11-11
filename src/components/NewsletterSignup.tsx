import { useState } from 'react';
import { toast } from 'sonner';
import { Mail, Loader2, Copy, Check, Gift, Sparkles } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useNewsletterSettings } from '@/hooks/use-newsletter';
import { subscribeEmailSchema, subscribeMessage, type NewsletterSettings, type SubscribeResult } from '@/lib/newsletter';

export function NewsletterView({ settings, preview = false }: { settings: NewsletterSettings; preview?: boolean }) {
  const [email, setEmail] = useState('');
  const [trap, setTrap] = useState('');
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<{ message: string; coupon: string | null } | null>(null);
  const [copied, setCopied] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (preview) { toast.info('Preview only — visitors subscribe on the homepage'); return; }
    const parsed = subscribeEmailSchema.safeParse(email);
    if (!parsed.success) { toast.error(parsed.error.issues[0]?.message ?? 'Enter a valid email address'); return; }
    if (trap) { setDone({ message: settings.success_message, coupon: null }); return; }
    setBusy(true);
    const { data, error } = await supabase.rpc('newsletter_subscribe', { p_email: parsed.data });
    setBusy(false);
    if (error) { toast.error(error.message || 'Could not subscribe, please try again'); return; }
    const r = data as unknown as SubscribeResult;
    setDone({ message: subscribeMessage(r, settings.success_message), coupon: r.coupon });
    setEmail('');
  }

  async function copy(code: string) {
    try { await navigator.clipboard.writeText(code); setCopied(true); toast.success('Coupon copied'); setTimeout(() => setCopied(false), 2000); }
    catch { toast.error('Copy failed — select the code instead'); }
  }

  const accent = { backgroundColor: settings.button_color, color: settings.button_text_color };
  return <section aria-labelledby="newsletter-title" className="newsletter-panel premium-card relative overflow-hidden" style={{ backgroundColor: settings.bg_color, color: settings.text_color }}>
    <div className="newsletter-glow" aria-hidden />
    <div className="relative grid gap-8 p-8 md:grid-cols-[1.2fr_1fr] md:items-center md:p-12">
      <div>
        {settings.badge_text.trim() && <span className="newsletter-badge"><Sparkles className="size-3.5" />{settings.badge_text}</span>}
        <h2 id="newsletter-title" className="mt-4 text-3xl leading-tight font-semibold md:text-4xl">{settings.title}</h2>
        {settings.description && <p className="mt-3 max-w-xl leading-relaxed opacity-80">{settings.description}</p>}
      </div>
      {done ? (
        <div className="newsletter-glass rounded-lg p-6" role="status">
          <p className="flex items-center gap-2 font-semibold"><Check className="size-5" />{done.message}</p>
          {done.coupon && <div className="mt-4">
            <p className="flex items-center gap-2 text-sm opacity-80"><Gift className="size-4" />Your welcome coupon</p>
            <div className="mt-2 flex items-center gap-2">
              <code className="newsletter-code flex-1 select-all rounded-md px-4 py-3 text-lg font-semibold tracking-widest">{done.coupon}</code>
              <Button type="button" onClick={() => copy(done.coupon!)} style={accent} className="h-12 hover:opacity-90">{copied ? <Check /> : <Copy />} Copy</Button>
            </div>
          </div>}
          <Button type="button" variant="link" className="mt-3 h-auto p-0 opacity-80" style={{ color: settings.text_color }} onClick={() => setDone(null)}>Use another email</Button>
        </div>
      ) : (
        <form onSubmit={submit} className="newsletter-glass rounded-lg p-2" noValidate>
          <div className="flex flex-col gap-2 sm:flex-row">
            <label htmlFor={preview ? 'newsletter-email-preview' : 'newsletter-email'} className="sr-only">Email address</label>
            <div className="relative flex-1">
              <Mail className="absolute top-1/2 left-3 size-4 -translate-y-1/2 opacity-60" />
              <Input id={preview ? 'newsletter-email-preview' : 'newsletter-email'} type="email" autoComplete="email" maxLength={254} required value={email} onChange={e => setEmail(e.target.value)} placeholder={settings.placeholder} className="newsletter-input h-12 border-0 pl-10 shadow-none" style={{ color: settings.text_color }} />
            </div>
            <input type="text" name="website" tabIndex={-1} autoComplete="off" value={trap} onChange={e => setTrap(e.target.value)} className="hidden" aria-hidden />
            <Button type="submit" disabled={busy} style={accent} className="h-12 px-6 font-semibold tracking-wide hover:opacity-90">{busy ? <Loader2 className="animate-spin" /> : settings.button_text}</Button>
          </div>
        </form>
      )}
    </div>
  </section>;
}

export function NewsletterSignup() {
  const { data } = useNewsletterSettings();
  if (!data || !data.is_enabled) return null;
  return <div className="mt-16"><NewsletterView settings={data} /></div>;
}
