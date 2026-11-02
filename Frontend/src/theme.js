import { createContext, createElement, useCallback, useContext, useMemo, useState } from 'react';
import { alpha, createTheme, ThemeProvider as MuiThemeProvider } from '@mui/material/styles';

const STORAGE_KEY = 'ticketing.themeMode';

export function buildTheme(mode = 'light') {
  const isDark = mode === 'dark';

  return createTheme({
    palette: {
      mode,
      primary: {
        main: isDark ? '#818cf8' : '#4f46e5',
        light: isDark ? '#a5b4fc' : '#6366f1',
        dark: isDark ? '#6366f1' : '#3730a3',
        contrastText: '#ffffff',
      },
      secondary: {
        main: isDark ? '#a78bfa' : '#7c3aed',
        light: '#c4b5fd',
        dark: '#5b21b6',
      },
      success: {
        main: '#10b981',
        light: '#34d399',
        dark: '#059669',
        contrastText: '#ffffff',
      },
      warning: {
        main: '#f59e0b',
        light: '#fbbf24',
        dark: '#d97706',
      },
      error: {
        main: '#ef4444',
        light: '#f87171',
        dark: '#dc2626',
      },
      info: {
        main: '#0ea5e9',
        light: '#38bdf8',
        dark: '#0284c7',
      },
      background: {
        default: isDark ? '#0b1120' : '#f1f5f9',
        paper: isDark ? '#111827' : '#ffffff',
      },
      text: {
        primary: isDark ? '#f1f5f9' : '#0f172a',
        secondary: isDark ? '#94a3b8' : '#475569',
      },
      divider: isDark ? '#1e293b' : '#e2e8f0',
    },
    shape: { borderRadius: 12 },
    typography: {
      fontFamily: 'Inter, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif',
      h4: { fontWeight: 800, letterSpacing: '-0.025em' },
      h5: { fontWeight: 700, letterSpacing: '-0.02em' },
      h6: { fontWeight: 700, letterSpacing: '-0.015em' },
      subtitle1: { fontWeight: 600, letterSpacing: '-0.01em' },
      subtitle2: { fontWeight: 600 },
      button: { textTransform: 'none', fontWeight: 600, letterSpacing: '-0.005em' },
    },
    components: {
      MuiCssBaseline: {
        styleOverrides: {
          body: {
            backgroundColor: isDark ? '#0b1120' : '#f1f5f9',
            transition: 'background-color 0.2s ease, color 0.2s ease',
          },
        },
      },
      MuiButton: {
        defaultProps: { disableElevation: true },
        styleOverrides: {
          root: {
            borderRadius: 10,
            padding: '8px 16px',
            transition: 'all 0.18s ease',
          },
          sizeSmall: {
            borderRadius: 8,
            padding: '5px 12px',
          },
          containedPrimary: {
            background: 'linear-gradient(135deg, #4f46e5 0%, #4338ca 100%)',
            color: '#ffffff',
            boxShadow: '0 2px 8px rgba(79, 70, 229, 0.28)',
            '&:hover': {
              background: 'linear-gradient(135deg, #4338ca 0%, #3730a3 100%)',
              boxShadow: '0 4px 14px rgba(79, 70, 229, 0.38)',
              transform: 'translateY(-1px)',
            },
          },
          containedSuccess: {
            background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
            color: '#ffffff',
            boxShadow: '0 2px 8px rgba(16, 185, 129, 0.25)',
            '&:hover': {
              background: 'linear-gradient(135deg, #059669 0%, #047857 100%)',
              boxShadow: '0 4px 12px rgba(16, 185, 129, 0.35)',
              transform: 'translateY(-1px)',
            },
          },
          outlined: {
            borderColor: isDark ? '#334155' : '#cbd5e1',
            color: isDark ? '#e2e8f0' : '#334155',
            backgroundColor: isDark ? '#1e293b' : '#ffffff',
            '&:hover': {
              borderColor: isDark ? '#475569' : '#94a3b8',
              backgroundColor: isDark ? '#334155' : '#f8fafc',
            },
          },
        },
      },
      MuiPaper: {
        styleOverrides: {
          root: {
            backgroundImage: 'none',
          },
          outlined: {
            borderColor: isDark ? '#1e293b' : '#e2e8f0',
            boxShadow: isDark
              ? '0 1px 3px 0 rgba(0, 0, 0, 0.35)'
              : '0 1px 3px 0 rgba(15, 23, 42, 0.04), 0 1px 2px -1px rgba(15, 23, 42, 0.03)',
          },
        },
      },
      MuiOutlinedInput: {
        styleOverrides: {
          root: {
            borderRadius: 10,
            backgroundColor: isDark ? '#0f172a' : '#ffffff',
            '& .MuiOutlinedInput-notchedOutline': {
              borderColor: isDark ? '#334155' : '#cbd5e1',
            },
            '&:hover .MuiOutlinedInput-notchedOutline': {
              borderColor: isDark ? '#475569' : '#94a3b8',
            },
            '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
              borderWidth: 2,
            },
          },
        },
      },
      MuiChip: {
        styleOverrides: {
          root: {
            fontWeight: 600,
            borderRadius: 8,
          },
        },
      },
      MuiDialog: {
        styleOverrides: {
          paper: {
            borderRadius: 16,
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.45)',
          },
        },
      },
      MuiToggleButtonGroup: {
        styleOverrides: {
          root: {
            backgroundColor: isDark ? '#0f172a' : '#f1f5f9',
            padding: 3,
            borderRadius: 10,
            gap: 2,
            border: isDark ? '1px solid #1e293b' : 'none',
          },
        },
      },
      MuiToggleButton: {
        styleOverrides: {
          root: {
            border: 'none',
            borderRadius: '8px !important',
            padding: '5px 14px',
            color: isDark ? '#94a3b8' : '#475569',
            fontWeight: 600,
            textTransform: 'none',
            '&.Mui-selected': {
              backgroundColor: isDark ? '#1e293b' : '#ffffff',
              color: isDark ? '#f8fafc' : '#0f172a',
              boxShadow: '0 1px 3px rgba(0, 0, 0, 0.2)',
              '&:hover': {
                backgroundColor: isDark ? '#1e293b' : '#ffffff',
              },
            },
          },
        },
      },
    },
  });
}

export const theme = buildTheme('light');

const ColorModeContext = createContext({ mode: 'light', toggleColorMode: () => {} });

export function ColorModeProvider({ children }) {
  const [mode, setMode] = useState(() => {
    try {
      return localStorage.getItem(STORAGE_KEY) === 'dark' ? 'dark' : 'light';
    } catch {
      return 'light';
    }
  });

  const toggleColorMode = useCallback(() => {
    setMode((prev) => {
      const next = prev === 'light' ? 'dark' : 'light';
      try {
        localStorage.setItem(STORAGE_KEY, next);
      } catch {
        /* ignore */
      }
      return next;
    });
  }, []);

  const activeTheme = useMemo(() => buildTheme(mode), [mode]);
  const ctx = useMemo(() => ({ mode, toggleColorMode }), [mode, toggleColorMode]);

  return createElement(
    ColorModeContext.Provider,
    { value: ctx },
    createElement(MuiThemeProvider, { theme: activeTheme }, children),
  );
}

export const useColorMode = () => useContext(ColorModeContext);

export const avatarColors = ['#4f46e5', '#0ea5e9', '#10b981', '#8b5cf6', '#f59e0b', '#ec4899'];
export function avatarColorFor(name = '') {
  let hash = 0;
  for (let i = 0; i < name.length; i += 1) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  const color = avatarColors[Math.abs(hash) % avatarColors.length];
  return { bg: alpha(color, 0.18), fg: color, solid: color };
}
