import { ArrowRight, Check, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ctaDefaults, safeCtaLink, type CtaSettings } from '@/lib/bottom-cta';

const TRUST_POINTS = [
  "১০০% ভাইরাস-মুক্ত ও ভেরিফায়েড",
  "ইনস্ট্যান্ট বিকাশ / নগদ পেমেন্ট",
  "২৪/৭ গেমার সাপোর্ট",
];

export function BottomCTA({
  settings = ctaDefaults,
  onBrowseOffers,
  onViewPaid,
}: {
  settings?: CtaSettings;
  onBrowseOffers?: () => void;
  onViewPaid?: () => void;
}) {
  if (!settings.is_visible) return null;
  const alignment = { left: 'text-left', center: 'text-center', right: 'text-right' }[settings.alignment];
  const justify = { left: 'justify-start', center: 'justify-center', right: 'justify-end' }[settings.alignment];
  const position = { left: 'mr-auto', center: 'mx-auto', right: 'ml-auto' }[settings.alignment];
  function action(text: string, link: string, secondary = false) {
    const safe = safeCtaLink(link);
    if (!safe) return null;
    const callback = safe === '#special-offers' ? onBrowseOffers : safe === '#paid-games' ? onViewPaid : undefined;
    return <Button variant={secondary ? 'outline' : 'default'} className="h-auto min-h-12 max-w-full whitespace-normal px-6 py-3 text-base font-medium" {...(callback ? { onClick: callback } : { asChild: true })}>
      {callback ? <>{text}{!secondary && <ArrowRight />}</> : <a href={safe}>{text}{!secondary && <ArrowRight />}</a>}
    </Button>;
  }
  return (
    <section className={`cta-banner mt-12 rounded-lg px-6 py-12 sm:px-10 sm:py-14 ${alignment}`}>
      {settings.background_image_url && <img src={settings.background_image_url} alt="" className="absolute inset-0 size-full object-cover" />}
      <div className={`relative ${settings.background_image_url ? 'cta-image-content rounded-lg p-5 sm:p-8' : ''}`}>
      <span className="cta-badge inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold tracking-wide uppercase">
        <Zap className="size-3.5" /> Instant access &amp; verified files
      </span>

      <h2 className={`${position} mt-4 max-w-2xl break-words text-3xl leading-tight font-semibold sm:text-4xl`}>
        {settings.headline}
      </h2>
      <p className={`${position} mt-2 max-w-xl whitespace-pre-wrap break-words text-base font-medium`}>
        {settings.subtitle}
      </p>
      <p className={`${position} mt-3 max-w-xl text-sm leading-relaxed text-muted-foreground sm:text-base`}>
        যেকোনো প্রিমিয়াম ও মডেড গেম সংগ্রহ করুন ঝামেলাহীন bKash / Nagad পেমেন্টে।
        ফুল ভেরিফায়েড ফাইল এবং ইনস্ট্যান্ট সাপোর্ট গ্যারান্টি।
      </p>

      <div className={`mt-7 flex flex-wrap items-center gap-3 ${justify}`}>
        {action(settings.primary_button_text, settings.primary_button_link)}
        {settings.secondary_enabled && action(settings.secondary_button_text, settings.secondary_button_link, true)}
      </div>

      <ul className={`mt-8 flex flex-wrap items-center gap-x-6 gap-y-2 text-sm ${justify}`}>
        {TRUST_POINTS.map((point) => (
          <li key={point} className="cta-trust flex items-center gap-1.5 font-medium">
            <Check className="size-4" /> {point}
          </li>
        ))}
      </ul>
      </div>
    </section>
  );
}
