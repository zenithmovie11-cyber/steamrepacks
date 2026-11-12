import { Link } from '@tanstack/react-router';
import { useQuery } from '@tanstack/react-query';
import { ArrowUp, Layers, Mail, Phone, MapPin, Clock, Facebook, Youtube, Instagram, MessageCircle, Send, MessagesSquare } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { publicFooterOptions } from '@/hooks/use-footer';
import { footerCopyright, socialPlatforms, type FooterSettings } from '@/lib/footer';

const socialIcons = { facebook: Facebook, discord: MessagesSquare, telegram: Send, youtube: Youtube, instagram: Instagram, whatsapp: MessageCircle };
export function StoreFooter({ onAction }: { onAction: (action: string) => void }) {
  const { data } = useQuery(publicFooterOptions);
  return data?.is_visible ? <FooterView settings={data} onAction={onAction} /> : null;
}
export function FooterView({ settings: s, onAction }: { settings: FooterSettings; onAction?: (action: string) => void }) {
  return <footer className="store-footer mt-12 border-t px-6 pt-12 pb-6 lg:px-8">
    <div className="grid gap-10 sm:grid-cols-2 xl:grid-cols-[1.4fr_1fr_1fr_1.2fr]">
      <div className="min-w-0"><div className="mb-4 flex items-center gap-3">{s.logo_url ? <img src={s.logo_url} alt={s.brand_name} className="size-12 shrink-0 object-contain" /> : <Layers className="size-9 shrink-0 text-primary" />}<p className="break-words text-2xl font-semibold">{s.brand_name}</p></div>{s.description && <p className="max-w-sm text-sm leading-7 text-muted-foreground whitespace-pre-wrap break-words">{s.description}</p>}</div>
      <div><h2 className="mb-4 text-sm font-semibold">Quick navigation</h2><ul className="space-y-1">{s.quick_links.map((link, i) => <li key={i}>{link.url.startsWith('#') ? <Button variant="link" className="h-auto max-w-full justify-start p-0 py-1.5 text-sm text-muted-foreground whitespace-normal text-left" onClick={() => onAction?.(link.url.slice(1))}>{link.label}</Button> : link.url === '/' ? <Link to="/" className="footer-link">{link.label}</Link> : <a href={link.url} target="_blank" rel="noopener noreferrer" className="footer-link">{link.label}</a>}</li>)}</ul></div>
      <div><h2 className="mb-4 text-sm font-semibold">Policy & legal</h2><ul className="space-y-1">{s.policies.map(p => <li key={p.slug}><Link to="/policies/$slug" params={{ slug: p.slug }} className="footer-link">{p.title}</Link></li>)}</ul></div>
      <div><h2 className="mb-4 text-sm font-semibold">Contact</h2><div className="space-y-3 text-sm text-muted-foreground">
        {s.contact_email && <a href={`mailto:${s.contact_email}`} className="flex items-start gap-2 break-all"><Mail className="mt-0.5 size-4 shrink-0" />{s.contact_email}</a>}
        {s.phone && <a href={`tel:${s.phone.replace(/[^+0-9]/g, '')}`} className="flex items-start gap-2 break-words"><Phone className="mt-0.5 size-4 shrink-0" />{s.phone}</a>}
        {s.address && <p className="flex items-start gap-2 whitespace-pre-wrap break-words"><MapPin className="mt-0.5 size-4 shrink-0" />{s.address}</p>}
        {s.support_hours && <p className="flex items-start gap-2 break-words"><Clock className="mt-0.5 size-4 shrink-0" />{s.support_hours}</p>}
      </div><div className="mt-5 flex flex-wrap gap-2">{socialPlatforms.filter(p => s.socials[p]).map(p => { const Icon = socialIcons[p]; return <Button key={p} asChild size="icon" variant="outline" title={p} aria-label={p}><a href={s.socials[p]} target="_blank" rel="noopener noreferrer"><Icon className="size-4" /></a></Button>; })}</div></div>
    </div>
    <div className="mt-10 flex flex-wrap items-center justify-between gap-4 border-t pt-5"><p className="text-xs text-muted-foreground break-words">{footerCopyright(s.copyright_text, new Date().getFullYear())}</p><Button variant="ghost" size="icon" aria-label="Back to top" title="Back to top" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}><ArrowUp /></Button></div>
  </footer>;
}