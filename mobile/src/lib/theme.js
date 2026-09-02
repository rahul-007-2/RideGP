import { Platform, Appearance } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import React from 'react';

// ─── Light Theme — warm, clean, modern ─────────────────────────────
const LightPalette = {
  // Primary (vibrant blue)
  primary: '#2563EB',
  primaryDark: '#1D4ED8',
  primaryLight: '#60A5FA',
  primarySurface: '#EFF6FF',

  // Accent
  accent: '#F43F5E',
  accentWarm: '#F59E0B',
  accentGreen: '#10B981',
  accentPurple: '#8B5CF6',
  accentTeal: '#14B8A6',

  // Backgrounds (warm off-whites, not stark white)
  background: '#F8FAFC',
  surface: '#FFFFFF',
  card: '#FFFFFF',
  elevated: '#FFFFFF',

  // Borders (subtle, warm grays)
  border: '#E2E8F0',
  borderLight: '#F1F5F9',

  // Text (rich dark, not pure black)
  text: '#0F172A',
  textSecondary: '#475569',
  textTertiary: '#94A3B8',
  textMuted: '#94A3B8',
  muted: '#94A3B8',
  textInverse: '#FFFFFF',

  // Status
  success: '#10B981',
  successSurface: '#ECFDF5',
  warning: '#F59E0B',
  warningSurface: '#FFFBEB',
  error: '#EF4444',
  errorSurface: '#FEF2F2',
  info: '#2563EB',
  infoSurface: '#EFF6FF',

  // Overlays
  overlay: 'rgba(15, 23, 42, 0.5)',
  shimmer: 'rgba(255, 255, 255, 0.6)',

  // Tab bar
  tabBar: '#FFFFFF',
  tabBarBorder: '#E2E8F0',
};

// ─── Dark Theme — rich, OLED-friendly, easy on eyes ────────────────
const DarkPalette = {
  // Primary (brighter blue for dark backgrounds)
  primary: '#60A5FA',
  primaryDark: '#3B82F6',
  primaryLight: '#93C5FD',
  primarySurface: '#1E3A5F',

  // Accent (slightly muted for dark)
  accent: '#FB7185',
  accentWarm: '#FBBF24',
  accentGreen: '#34D399',
  accentPurple: '#A78BFA',
  accentTeal: '#2DD4BF',

  // Backgrounds (true dark, not gray — OLED saves battery)
  background: '#0A0E14',
  surface: '#131820',
  card: '#1A2030',
  elevated: '#1E2636',

  // Borders (dark but visible)
  border: '#2A3344',
  borderLight: '#1E2636',

  // Text (soft whites, not harsh)
  text: '#F1F5F9',
  textSecondary: '#94A3B8',
  textTertiary: '#64748B',
  textMuted: '#64748B',
  muted: '#64748B',
  textInverse: '#0F172A',

  // Status (same hues, slightly brighter for contrast)
  success: '#34D399',
  successSurface: '#0D2818',
  warning: '#FBBF24',
  warningSurface: '#272008',
  error: '#F87171',
  errorSurface: '#2D1215',
  info: '#60A5FA',
  infoSurface: '#0F1D33',

  // Overlays
  overlay: 'rgba(0, 0, 0, 0.7)',
  shimmer: 'rgba(255, 255, 255, 0.04)',

  // Tab bar
  tabBar: '#131820',
  tabBarBorder: '#2A3344',
};

// ─── Global reactive theme system ──────────────────────────────────
// Modes: 'system' | 'light' | 'dark'
let userPreference = 'system'; // what the user chose
let resolvedMode = 'light';    // actual applied mode
let listeners = new Set();

function getSystemMode() {
  return Appearance.getColorScheme() === 'dark' ? 'dark' : 'light';
}

function resolveAndApply() {
  resolvedMode = userPreference === 'system' ? getSystemMode() : userPreference;
  const pal = resolvedMode === 'dark' ? DarkPalette : LightPalette;
  Object.keys(Colors).forEach(key => {
    if (pal[key] !== undefined) Colors[key] = pal[key];
  });
  rebuildTypography();
  rebuildShadows();
  listeners.forEach(fn => fn(resolvedMode));
}

/**
 * Set theme preference: 'system' | 'light' | 'dark'
 */
export function setThemeMode(mode) {
  userPreference = mode;
  AsyncStorage.setItem('themeMode', mode);
  resolveAndApply();
}

/**
 * Get current theme preference
 */
export function getThemeMode() {
  return userPreference;
}

/**
 * Get the resolved mode (actual 'light' or 'dark')
 */
export function getResolvedMode() {
  return resolvedMode;
}

/**
 * Check if currently dark
 */
export function isDarkMode() {
  return resolvedMode === 'dark';
}

export function addThemeListener(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

// ─── Colors — mutable, updated in-place on theme change ───────────
export const Colors = { ...LightPalette };

// ─── Typography ────────────────────────────────────────────────────
export const Typography = {
  hero:    { fontSize: 34, fontWeight: '800', color: Colors.text, letterSpacing: -0.5 },
  h1:      { fontSize: 28, fontWeight: '700', color: Colors.text, letterSpacing: -0.3 },
  h2:      { fontSize: 22, fontWeight: '700', color: Colors.text },
  h3:      { fontSize: 18, fontWeight: '600', color: Colors.text },
  subtitle:{ fontSize: 16, fontWeight: '500', color: Colors.textSecondary },
  body:    { fontSize: 15, fontWeight: '400', color: Colors.text, lineHeight: 22 },
  caption: { fontSize: 13, fontWeight: '400', color: Colors.textMuted },
  small:   { fontSize: 11, fontWeight: '500', color: Colors.textMuted },
  label:   { fontSize: 13, fontWeight: '600', color: Colors.textSecondary },
  stat:    { fontSize: 28, fontWeight: '800', color: Colors.primary },
  statSmall:{ fontSize: 20, fontWeight: '700', color: Colors.primary },
};

function rebuildTypography() {
  Object.assign(Typography.hero,     { color: Colors.text });
  Object.assign(Typography.h1,       { color: Colors.text });
  Object.assign(Typography.h2,       { color: Colors.text });
  Object.assign(Typography.h3,       { color: Colors.text });
  Object.assign(Typography.subtitle, { color: Colors.textSecondary });
  Object.assign(Typography.body,     { color: Colors.text });
  Object.assign(Typography.caption,  { color: Colors.textMuted });
  Object.assign(Typography.small,    { color: Colors.textMuted });
  Object.assign(Typography.label,    { color: Colors.textSecondary });
  Object.assign(Typography.stat,     { color: Colors.primary });
  Object.assign(Typography.statSmall,{ color: Colors.primary });
}

// ─── Shadows (dark mode uses subtler shadows) ─────────────────────
export const Shadows = {
  small:   { shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 2, elevation: 1 },
  medium:  { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 8, elevation: 3 },
  large:   { shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.12, shadowRadius: 16, elevation: 6 },
  primary: { shadowColor: Colors.primary, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 12, elevation: 6 },
};

function rebuildShadows() {
  Shadows.primary.shadowColor = Colors.primary;
}

export const Spacing = { xs: 4, sm: 8, md: 12, lg: 16, xl: 20, xxl: 24, xxxl: 32 };
export const Radii  = { sm: 8, md: 12, lg: 16, xl: 20, xxl: 24, full: 9999 };

// ─── Initialize: read saved preference, listen to system changes ──
AsyncStorage.getItem('themeMode').then(saved => {
  if (saved === 'system' || saved === 'light' || saved === 'dark') {
    userPreference = saved;
  }
  resolveAndApply();
});

// Listen to system appearance changes (when mode is 'system')
Appearance.addChangeListener(() => {
  if (userPreference === 'system') {
    resolveAndApply();
  }
});

// ─── useColors() hook — forces re-render on theme change ──────────
export function useColors() {
  const [, setTick] = React.useState(0);
  React.useEffect(() => {
    return addThemeListener(() => setTick(t => t + 1));
  }, []);
  return Colors;
}

// ─── Legacy compat ────────────────────────────────────────────────
export const headerStyle = { fontSize: 20, fontWeight: '700', color: Colors.primary };
export const spacing = (n) => n * 8;
