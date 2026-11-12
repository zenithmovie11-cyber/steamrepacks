import { createFileRoute, Link, notFound } from '@tanstack/react-router';
import { ArrowLeft } from 'lucide-react';
import { publicFooterOptions } from '@/hooks/use-footer';
import { Button } from '@/components/ui/button';

export const Route = createFileRoute('/policies/$slug')({
  loader: async ({ context, params }) => {
    const footer = await context.queryClient.ensureQueryData(publicFooterOptions);
    const policy = footer?.policies.find(p => p.slug === params.slug);
    if (!policy || !footer) throw notFound();
    return { policy, brand: footer.brand_name };
  },
  head: ({ loaderData }) => {
    const title = loaderData ? `${loaderData.policy.title} — ${loaderData.brand}` : 'Policy unavailable — Monolith';
    const description = loaderData ? `${loaderData.policy.title} for ${loaderData.brand}.` : 'This policy is unavailable.';
    return { meta: [{ title }, { name: 'description', content: description }, { property: 'og:title', content: title }, { property: 'og:description', content: description }, { property: 'og:type', content: 'website' }, { name: 'twitter:card', content: 'summary' }] };
  },
  component: PolicyPage,
});
function PolicyPage() {
  const { policy, brand } = Route.useLoaderData();
  return <main className="mx-auto min-h-screen max-w-3xl px-6 py-12"><Button asChild variant="ghost" className="mb-10"><Link to="/"><ArrowLeft />{brand}</Link></Button><h1 className="mb-8 text-3xl font-semibold break-words">{policy.title}</h1><div className="text-base leading-8 whitespace-pre-wrap break-words">{policy.content}</div></main>;
}