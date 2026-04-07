import AsyncStorage from '@react-native-async-storage/async-storage';
import { DarkTheme, DefaultTheme, type Theme } from '@react-navigation/native';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { useColorScheme as useSystemColorScheme } from 'react-native';

import { getAppThemeColors } from '@/constants/app-theme';
import { Palette } from '@/constants/palette';

const STORAGE_KEY = '@caltrackai/themePreference';

export type ThemePreference = 'light' | 'dark' | 'system';

type Ctx = {
  preference: ThemePreference;
  setPreference: (p: ThemePreference) => void;
  resolvedScheme: 'light' | 'dark';
  isDark: boolean;
  colors: ReturnType<typeof getAppThemeColors>;
  navigationTheme: Theme;
};

const AppThemeContext = createContext<Ctx | null>(null);

function resolveScheme(pref: ThemePreference, system: 'light' | 'dark' | null | undefined): 'light' | 'dark' {
  if (pref === 'light' || pref === 'dark') return pref;
  return system === 'dark' ? 'dark' : 'light';
}

export function AppThemeProvider({ children }: { children: ReactNode }) {
  const systemScheme = useSystemColorScheme();
  const [preference, setPreferenceState] = useState<ThemePreference>('system');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(STORAGE_KEY);
        if (cancelled) return;
        if (raw === 'light' || raw === 'dark' || raw === 'system') {
          setPreferenceState(raw);
        }
      } catch {
        /* keep default */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const setPreference = useCallback((p: ThemePreference) => {
    setPreferenceState(p);
    void AsyncStorage.setItem(STORAGE_KEY, p).catch(() => {});
  }, []);

  const resolvedScheme = resolveScheme(preference, systemScheme);
  const isDark = resolvedScheme === 'dark';
  const colors = useMemo(() => getAppThemeColors(isDark), [isDark]);

  const navigationTheme = useMemo<Theme>(() => {
    const base = isDark ? DarkTheme : DefaultTheme;
    return {
      ...base,
      colors: {
        ...base.colors,
        primary: Palette.iris,
        background: colors.bg,
        card: colors.surface,
        text: colors.text,
        border: colors.border,
        notification: Palette.flamingo,
      },
    };
  }, [isDark, colors]);

  const value = useMemo(
    () => ({
      preference,
      setPreference,
      resolvedScheme,
      isDark,
      colors,
      navigationTheme,
    }),
    [preference, setPreference, resolvedScheme, isDark, colors, navigationTheme]
  );

  return <AppThemeContext.Provider value={value}>{children}</AppThemeContext.Provider>;
}

export function useAppTheme() {
  const ctx = useContext(AppThemeContext);
  if (!ctx) {
    throw new Error('useAppTheme must be used within AppThemeProvider');
  }
  return ctx;
}
