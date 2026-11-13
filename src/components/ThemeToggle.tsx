import { useEffect, useState } from 'react';
import { Moon, Sun } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { onThemeChange, readTheme, setTheme, type Theme } from '@/lib/theme';

export function useTheme() {
  const [theme, set] = useState<Theme>('light');
  useEffect(() => { set(readTheme()); return onThemeChange(set); }, []);
  return { theme, toggle: () => setTheme(theme === 'dark' ? 'light' : 'dark') };
}

export function ThemeToggle({ className }: { className?: string }) {
  const { theme, toggle } = useTheme();
  const dark = theme === 'dark';
  return (
    <Button variant="outline" size="icon" className={`border ${className ?? ''}`} onClick={toggle}
      aria-label={dark ? 'Switch to light mode' : 'Switch to dark mode'} title={dark ? 'Light mode' : 'Dark mode'}>
      {dark ? <Sun /> : <Moon />}
    </Button>
  );
}
