import { Platform } from 'react-native';

// ─── Color Palette ────────────────────────────────────────────────
export const Colors = {
  // Primary gradient endpoints
  primary: '#0A84FF',
  primaryDark: '#0066CC',
  primaryLight: '#4DA3FF',
  
  // Accent
  accent: '#FF6B6B',
  accentWarm: '#FF9F43',
  accentGreen: '#2ED573',
  accentPurple: '#A855F7',
  
  // Neutrals
  background: '#F4F6FA',
  surface: '#FFFFFF',
  card: '#FFFFFF',
  border: '#E8ECF0',
  borderLight: '#F0F2F5',
  
  // Text
  text: '#1A1D26',
  textSecondary: '#6B7280',
  textMuted: '#9CA3AF',
  muted: '#9CA3AF',
  
  // Status
  success: '#2ED573',
  warning: '#FF9F43',
  error: '#FF4757',
  info: '#0A84FF',
  
  // Overlays
  overlay: 'rgba(0, 0, 0, 0.5)',
  shimmer: 'rgba(255, 255, 255, 0.3)',
};

// ─── Typography ───────────────────────────────────────────────────
export const Typography = {
  hero: {
    fontSize: 34,
    fontWeight: '800',
    color: Colors.text,
    letterSpacing: -0.5,
  },
  h1: {
    fontSize: 28,
    fontWeight: '700',
    color: Colors.text,
    letterSpacing: -0.3,
  },
  h2: {
    fontSize: 22,
    fontWeight: '700',
    color: Colors.text,
  },
  h3: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.text,
  },
  subtitle: {
    fontSize: 16,
    fontWeight: '500',
    color: Colors.textSecondary,
  },
  body: {
    fontSize: 15,
    fontWeight: '400',
    color: Colors.text,
    lineHeight: 22,
  },
  caption: {
    fontSize: 13,
    fontWeight: '400',
    color: Colors.textMuted,
  },
  small: {
    fontSize: 11,
    fontWeight: '500',
    color: Colors.textMuted,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  stat: {
    fontSize: 28,
    fontWeight: '800',
    color: Colors.primary,
  },
  statSmall: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.primary,
  },
};

// ─── Shadows ──────────────────────────────────────────────────────
export const Shadows = {
  small: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 2,
    elevation: 1,
  },
  medium: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  large: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 6,
  },
  primary: {
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 6,
  },
};

// ─── Spacing ──────────────────────────────────────────────────────
export const Spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
};

// ─── Border Radius ────────────────────────────────────────────────
export const Radii = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  full: 9999,
};

// ─── Legacy compat (backward-compatible, kept for screens not yet migrated) ──
export const headerStyle = { fontSize: 20, fontWeight: '700', color: Colors.primary };
export const spacing = (n) => n * 8;
