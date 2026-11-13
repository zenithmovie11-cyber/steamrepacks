export type Theme = 'light' | 'dark';
export const THEME_KEY = 'theme';
const EVENT = 'monolith-theme-change';

/** Light is the default; only an explicit saved "dark" switches the site. */
export function parseTheme(value: string | null | undefined): Theme {
  return value === 'dark' ? 'dark' : 'light';
}

/** Runs in <head> before paint so a saved dark preference never flashes light. */
export const themeBootScript = `try{var t=localStorage.getItem('${THEME_KEY}');if(t==='dark'){document.documentElement.classList.add('dark');document.documentElement.style.colorScheme='dark'}}catch(e){}`;

export function readTheme(): Theme {
  try { return parseTheme(localStorage.getItem(THEME_KEY)); } catch { return 'light'; }
}

export function setTheme(theme: Theme) {
  const root = document.documentElement;
  root.classList.toggle('dark', theme === 'dark');
  root.style.colorScheme = theme;
  try { localStorage.setItem(THEME_KEY, theme); } catch { /* storage blocked */ }
  window.dispatchEvent(new CustomEvent(EVENT, { detail: theme }));
}

export function onThemeChange(cb: (t: Theme) => void) {
  const local = (e: Event) => cb((e as CustomEvent<Theme>).detail);
  const other = (e: StorageEvent) => { if (e.key === THEME_KEY) { const t = parseTheme(e.newValue); document.documentElement.classList.toggle('dark', t === 'dark'); cb(t); } };
  window.addEventListener(EVENT, local);
  window.addEventListener('storage', other);
  return () => { window.removeEventListener(EVENT, local); window.removeEventListener('storage', other); };
}
