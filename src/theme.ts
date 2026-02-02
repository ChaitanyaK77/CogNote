/**
 * Cognote — Light / Dark theme with blue accent. Modular and professional.
 */

import { createContext, useCallback, useContext, useMemo, useState, createElement, type ReactNode } from 'react';

export type ThemeMode = 'light' | 'dark';

export const APP_NAME = 'CogNote';

const blue = {
  main: '#2563eb',
  bright: '#3b82f6',
  dark: '#1d4ed8',
  muted: 'rgba(37, 99, 235, 0.6)',
  glow: 'rgba(59, 130, 246, 0.25)',
} as const;

export interface Theme {
  mode: ThemeMode;
  bg: { root: string; panel: string; surface: string; elevated: string; bar: string; input: string };
  border: { default: string; strong: string; subtle: string };
  accent: typeof blue;
  text: { primary: string; secondary: string; muted: string; inverse: string };
  hover: { panel: string; accent: string; danger: string };
  sidebarWidth: number;
  topBarHeight: number;
  navbarShadow: string;
  cardRadius: number;
  inputRadius: number;
}

function getTheme(mode: ThemeMode): Theme {
  if (mode === 'light') {
    return {
      mode: 'light',
      bg: {
        root: '#f8fafc',
        panel: '#ffffff',
        surface: '#f1f5f9',
        elevated: '#ffffff',
        bar: '#ffffff',
        input: '#e2e8f0',
      },
      border: {
        default: 'rgba(37, 99, 235, 0.25)',
        strong: 'rgba(37, 99, 235, 0.4)',
        subtle: 'rgba(0, 0, 0, 0.08)',
      },
      accent: blue,
      text: {
        primary: '#0f172a',
        secondary: '#475569',
        muted: '#64748b',
        inverse: '#ffffff',
      },
      hover: {
        panel: 'rgba(0, 0, 0, 0.04)',
        accent: 'rgba(37, 99, 235, 0.1)',
        danger: 'rgba(220, 38, 38, 0.1)',
      },
      sidebarWidth: 72,
      topBarHeight: 56,
      navbarShadow: '0 2px 8px rgba(0,0,0,0.06)',
      cardRadius: 12,
      inputRadius: 8,
    };
  }
  return {
    mode: 'dark',
    bg: {
      root: '#0f172a',
      panel: '#1e293b',
      surface: '#334155',
      elevated: '#475569',
      bar: '#1e293b',
      input: '#334155',
    },
    border: {
      default: 'rgba(59, 130, 246, 0.2)',
      strong: 'rgba(59, 130, 246, 0.35)',
      subtle: 'rgba(255, 255, 255, 0.06)',
    },
    accent: blue,
    text: {
      primary: '#f8fafc',
      secondary: '#94a3b8',
      muted: '#64748b',
      inverse: '#0f172a',
    },
    hover: {
      panel: 'rgba(255, 255, 255, 0.04)',
      accent: 'rgba(59, 130, 246, 0.12)',
      danger: 'rgba(239, 68, 68, 0.15)',
    },
    sidebarWidth: 72,
    topBarHeight: 56,
    navbarShadow: '0 4px 20px rgba(0,0,0,0.25)',
    cardRadius: 12,
    inputRadius: 8,
  };
}

type ThemeContextValue = { theme: Theme; mode: ThemeMode; setMode: (m: ThemeMode) => void; toggleMode: () => void };

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [mode, setMode] = useState<ThemeMode>(() => {
    if (typeof window === 'undefined') return 'dark';
    const stored = localStorage.getItem('cognote-theme') as ThemeMode | null;
    if (stored === 'light' || stored === 'dark') return stored;
    return window.matchMedia?.('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
  });

  const setModePersist = useCallback((m: ThemeMode) => {
    setMode(m);
    try {
      localStorage.setItem('cognote-theme', m);
    } catch { /* ignore */ }
  }, []);

  const toggleMode = useCallback(() => {
    setModePersist(mode === 'light' ? 'dark' : 'light');
  }, [mode, setModePersist]);

  const value = useMemo<ThemeContextValue>(
    () => ({ theme: getTheme(mode), mode, setMode: setModePersist, toggleMode }),
    [mode, setModePersist, toggleMode]
  );

  return createElement(ThemeContext.Provider, { value }, children);
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider');
  return ctx;
}

/** Fallback theme for use outside provider (e.g. static styles). */
export const themeFallback = getTheme('dark');
