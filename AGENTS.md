<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

- Keep app-wide visual roles in src/styles.css semantic tokens and shared UI controls; page styling must reuse them for consistency.
- Roles use protected database tables and authenticated SECURITY DEFINER RPCs; email assignments work before sign-in, all mutations write immutable audit records, and original administrators cannot be demoted. UI permissions come from my_permissions, while RLS and report RPCs enforce each capability independently.
- Shared dashboard headers, metric accents and content-card treatments live in global CSS; this keeps all content and admin screens visually consistent without changing their data or permissions.
- Apply the app's fixed theme in the root layout so direct navigation and previously saved browser preferences cannot produce inconsistent page themes.
- Analytics tracking is mounted once in the root; anonymous same-origin events enter a bounded server-only ingestion endpoint, while aggregate reads enforce public.is_admin() in the database. This separates public measurement from private admin reporting.
- Overview visitor metrics also use server-recorded analytics_sessions; the deprecated visitor_pings table accepts no browser writes, preventing arbitrary visitor-record edits.
- Analytics uses first-party pseudonymous visitor IDs, inactivity-based sessions, visible-time engagement and hosting-provided geolocation only; unavailable location stays Unknown to avoid fabricated demographics.
- Acquisition is classified server-side from origin-only entry referrers and saved only on session insertion; wrappers preserve existing analytics RPCs and historical sessions remain unattributed to avoid fabricated sources or navigation overwrites.
- Hero slider controls are persisted separately with admin-only writes; Embla handles carousel navigation, while deadlines are stored in UTC and expired offers are excluded at render time.
- Hero button click ingestion requires same-origin bounded requests and a recent recorded analytics session; service-only RPCs deduplicate and rate-limit writes, and admin-only aggregates report actual clicks without public counters.
- IP firewall runs in src/server.ts only for Cloudflare-edge requests (request.cf present) and fails open; why: cf-connecting-ip is only trustworthy at the edge and a DB outage must not take the site down.
- Bottom CTA uses singleton settings with bottom_cta.manage write policies and a shared renderer; this keeps admin previews and homepage output consistent.
- Lookbooks use separate album, image and hotspot records with lookbooks.manage write/read-draft policies; private storage grants public reads only for published albums and uses short-lived signed URLs to limit access after unpublishing.
- Lookbook hotspots use image-relative percentages on uncropped images, and the shared gallery renderer handles grid, Embla slider and masonry layouts so editor previews match the public gallery.
- Each admin section has its own permission key (src/lib/permissions.ts mirrors the manage_app_role allow-list, my_permissions protected list and RLS checks); why: roles can grant one section without exposing the others, so all three must change together.
- Checkout prices, live offers and subscriber coupons are recalculated by a database insert trigger using the authenticated buyer; why: browser totals and identity cannot be trusted. Coupon discounts remain disabled until an administrator configures a positive amount.
- Campaign drafts are device-local and export escaped HTML without sending; why: promotional delivery requires a dedicated marketing service and must not use app-email infrastructure.
