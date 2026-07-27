'use client';

import { createContext, useCallback, useContext, useEffect, useState } from 'react';

/**
 * Theme state for the console.
 *
 * Replaces Cloudscape's `applyMode`, which set `.awsui-dark-mode` on the root
 * element. This sets `.dark` instead, which is what the `dark:` variant in
 * globals.css keys off. The storage key is unchanged, so a user who picked dark
 * mode before this rewrite still lands in dark mode after it.
 */

const STORAGE_KEY = 'r53-theme';

export type Theme = 'light' | 'dark';

interface ThemeContextValue {
  theme: Theme;
  toggleTheme: () => void;
  setTheme: (theme: Theme) => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

/**
 * The script that runs before first paint.
 *
 * Without it the page renders in light mode, then flips to dark once React
 * hydrates — a white flash on every load for anyone using dark mode. This is
 * inlined into <head> and executes synchronously, so the class is on <html>
 * before the browser paints anything.
 *
 * It is deliberately a string rather than a component: it has to run ahead of
 * the framework, which means it cannot be React at all.
 */
export const THEME_SCRIPT = `(function(){try{var s=localStorage.getItem('${STORAGE_KEY}');var d=s==='dark'||(s===null&&matchMedia('(prefers-color-scheme: dark)').matches);document.documentElement.classList.toggle('dark',d);document.documentElement.style.colorScheme=d?'dark':'light';}catch(e){}})();`;

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  // Starts light and corrects in the effect below. Reading localStorage during
  // render would produce different HTML on the server than in the browser,
  // which is a hydration mismatch; the pre-paint script above is what actually
  // prevents the flash, so this initial value is never seen.
  const [theme, setThemeState] = useState<Theme>('light');

  useEffect(() => {
    setThemeState(document.documentElement.classList.contains('dark') ? 'dark' : 'light');
  }, []);

  const setTheme = useCallback((next: Theme) => {
    setThemeState(next);
    document.documentElement.classList.toggle('dark', next === 'dark');
    document.documentElement.style.colorScheme = next;
    try {
      window.localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // Private browsing can refuse writes. The theme still applies for this
      // session; only the memory of it is lost.
    }
  }, []);

  const toggleTheme = useCallback(() => {
    setTheme(document.documentElement.classList.contains('dark') ? 'light' : 'dark');
  }, [setTheme]);

  // Follows the OS only while the user has expressed no preference of their
  // own, so an explicit choice is never overridden by a system change.
  useEffect(() => {
    const media = window.matchMedia('(prefers-color-scheme: dark)');

    function handleChange(event: MediaQueryListEvent) {
      if (window.localStorage.getItem(STORAGE_KEY) !== null) return;
      setThemeState(event.matches ? 'dark' : 'light');
      document.documentElement.classList.toggle('dark', event.matches);
    }

    media.addEventListener('change', handleChange);
    return () => media.removeEventListener('change', handleChange);
  }, []);

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme(): ThemeContextValue {
  const context = useContext(ThemeContext);
  if (!context) throw new Error('useTheme must be used inside ThemeProvider');
  return context;
}
