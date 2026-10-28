'use client';
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { Monitor, Moon, Sun } from 'lucide-react';
type Theme = 'light' | 'dark' | 'system';
const ThemeContext = createContext<{ theme: Theme; setTheme: (theme: Theme) => void }>({
  theme: 'system',
  setTheme: () => {},
});
export const themeScript = `(function(){try{var t=localStorage.getItem('teamora-theme')||'system';document.documentElement.dataset.theme=t==='system'?(matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light'):t}catch(e){document.documentElement.dataset.theme=matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light'}})()`;
export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, update] = useState<Theme>('system');
  useEffect(() => {
    const media = matchMedia('(prefers-color-scheme: dark)');
    const sync = () => {
      let value: Theme = 'system';
      try {
        const saved = localStorage.getItem('teamora-theme');
        if (saved === 'light' || saved === 'dark') value = saved;
      } catch {}
      update(value);
      document.documentElement.dataset.theme =
        value === 'system' ? (media.matches ? 'dark' : 'light') : value;
    };
    sync();
    media.addEventListener('change', sync);
    window.addEventListener('storage', sync);
    return () => {
      media.removeEventListener('change', sync);
      window.removeEventListener('storage', sync);
    };
  }, []);
  function setTheme(value: Theme) {
    update(value);
    try {
      localStorage.setItem('teamora-theme', value);
    } catch {}
    document.documentElement.dataset.theme =
      value === 'system'
        ? matchMedia('(prefers-color-scheme: dark)').matches
          ? 'dark'
          : 'light'
        : value;
  }
  return <ThemeContext.Provider value={{ theme, setTheme }}>{children}</ThemeContext.Provider>;
}
export function ThemeSwitch({ compact = false }: { compact?: boolean }) {
  const { theme, setTheme } = useContext(ThemeContext);
  return (
    <div
      className={'theme-switch ' + (compact ? 'theme-compact' : '')}
      role="group"
      aria-label="Appearance"
    >
      {(
        [
          { value: 'light', Icon: Sun },
          { value: 'dark', Icon: Moon },
          { value: 'system', Icon: Monitor },
        ] as const
      ).map(({ value, Icon }) => (
        <button
          key={value}
          type="button"
          title={`${value[0].toUpperCase() + value.slice(1)} theme`}
          aria-label={`${value} theme`}
          aria-pressed={theme === value}
          onClick={() => setTheme(value)}
        >
          <Icon size={15} />
          {!compact && <span>{value}</span>}
        </button>
      ))}
    </div>
  );
}
