import React, { createContext, useContext, useState, useEffect } from 'react';
import { Colors, getThemeMode, setThemeMode, addThemeListener, isDarkMode } from './theme';

const ThemeContext = createContext(null);

/**
 * Theme modes: 'system' | 'light' | 'dark'
 * 'system' follows the OS setting (default)
 * 'light' / 'dark' override the OS setting
 */
export function ThemeProvider({ children }) {
  const [mode, setMode] = useState(getThemeMode()); // 'system' | 'light' | 'dark'
  const [isDark, setIsDark] = useState(isDarkMode());

  useEffect(() => {
    return addThemeListener((resolved) => {
      setMode(getThemeMode());
      setIsDark(resolved === 'dark');
    });
  }, []);

  /**
   * Cycle: system → light → dark → system
   */
  const cycleTheme = () => {
    const next = mode === 'system' ? 'light' : mode === 'light' ? 'dark' : 'system';
    setThemeMode(next);
  };

  /**
   * Set a specific mode
   */
  const setTheme = (newMode) => {
    setThemeMode(newMode);
  };

  return (
    <ThemeContext.Provider value={{ mode, isDark, cycleTheme, setTheme, colors: Colors }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider');
  return ctx;
}
