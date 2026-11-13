export type VideoSource = { kind: 'youtube' | 'vimeo'; src: string } | { kind: 'file'; src: string };

function youtubeId(u: URL) {
  const host = u.hostname.replace(/^www\.|^m\./, '');
  if (host === 'youtu.be') return u.pathname.slice(1).split('/')[0];
  if (host === 'youtube.com' || host === 'youtube-nocookie.com') {
    if (u.pathname === '/watch') return u.searchParams.get('v');
    const m = u.pathname.match(/^\/(?:embed|shorts|live)\/([^/?]+)/);
    return m?.[1] ?? null;
  }
  return null;
}

/** Turns a product video link into something the detail view can play. Only https links are accepted. */
export function videoSource(url?: string | null): VideoSource | null {
  if (!url?.trim()) return null;
  let u: URL;
  try { u = new URL(url.trim()); } catch { return null; }
  if (u.protocol !== 'https:') return null;
  const yt = youtubeId(u);
  if (yt && /^[\w-]{6,20}$/.test(yt)) {
    return { kind: 'youtube', src: `https://www.youtube-nocookie.com/embed/${yt}?autoplay=1&mute=1&loop=1&playlist=${yt}&rel=0&playsinline=1&vq=hd1080` };
  }
  const host = u.hostname.replace(/^www\./, '');
  if (host === 'vimeo.com' || host === 'player.vimeo.com') {
    const id = u.pathname.match(/(\d{5,})/)?.[1];
    if (id) return { kind: 'vimeo', src: `https://player.vimeo.com/video/${id}?autoplay=1&muted=1&loop=1&quality=1080p` };
    return null;
  }
  return { kind: 'file', src: u.toString() };
}
