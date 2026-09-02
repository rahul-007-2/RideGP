import React from 'react';
import {
  TouchableOpacity,
  Text,
  View,
  StyleSheet,
  ActivityIndicator,
  Pressable,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors, Typography, Shadows, Spacing, Radii, useColors } from './theme';

// ─── Premium Button ───────────────────────────────────────────────
export function PrimaryButton({ title, onPress, disabled, loading, style, icon, small }) {
  return (
    <TouchableOpacity
      activeOpacity={0.8}
      onPress={onPress}
      disabled={disabled || loading}
      style={[
        small ? btnStyles.primarySmall : btnStyles.primary,
        (disabled || loading) && btnStyles.disabled,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color="#fff" size="small" />
      ) : (
        <View style={btnStyles.row}>
          {icon && <Text style={small ? btnStyles.iconSmall : btnStyles.icon}>{icon}</Text>}
          <Text style={small ? btnStyles.primaryTextSmall : btnStyles.primaryText}>{title}</Text>
        </View>
      )}
    </TouchableOpacity>
  );
}

export function SecondaryButton({ title, onPress, disabled, style, icon }) {
  return (
    <TouchableOpacity
      activeOpacity={0.8}
      onPress={onPress}
      disabled={disabled}
      style={[btnStyles.secondary, disabled && btnStyles.disabled, style]}
    >
      <View style={btnStyles.row}>
        {icon && <Text style={btnStyles.icon}>{icon}</Text>}
        <Text style={btnStyles.secondaryText}>{title}</Text>
      </View>
    </TouchableOpacity>
  );
}

export function DangerButton({ title, onPress, disabled, style }) {
  return (
    <TouchableOpacity
      activeOpacity={0.8}
      onPress={onPress}
      disabled={disabled}
      style={[btnStyles.danger, disabled && btnStyles.disabled, style]}
    >
      <Text style={btnStyles.dangerText}>{title}</Text>
    </TouchableOpacity>
  );
}

export function TextButton({ title, onPress, style, color }) {
  return (
    <Pressable onPress={onPress} style={style}>
      <Text style={[btnStyles.textBtn, color && { color }]}>{title}</Text>
    </Pressable>
  );
}

// ─── Card ─────────────────────────────────────────────────────────
export function Card({ children, style, noPadding }) {
  const C = useColors();
  return (
    <View style={[{ backgroundColor: C.card, borderRadius: Radii.lg, padding: Spacing.lg, marginBottom: Spacing.lg, ...Shadows.medium }, noPadding && { padding: 0 }, style]}>
      {children}
    </View>
  );
}

// ─── Screen Header ────────────────────────────────────────────────
export function ScreenHeader({ title, subtitle, rightAction, rightIcon, onRightPress }) {
  const insets = useSafeAreaInsets();
  return (
    <View style={[headerStyles.container, { paddingTop: insets.top + Spacing.md }]}>
      <View style={headerStyles.titleBlock}>
        <Text style={headerStyles.title}>{title}</Text>
        {subtitle && <Text style={headerStyles.subtitle}>{subtitle}</Text>}
      </View>
      {rightAction ? (
        <TouchableOpacity onPress={onRightPress} style={headerStyles.actionBtn}>
          <Text style={headerStyles.actionText}>{rightAction}</Text>
        </TouchableOpacity>
      ) : rightIcon ? (
        <TouchableOpacity onPress={onRightPress} style={headerStyles.actionBtn}>
          <Text style={headerStyles.actionIcon}>{rightIcon}</Text>
        </TouchableOpacity>
      ) : null}
    </View>
  );
}

// ─── Back Header (with back button) ───────────────────────────────
export function BackHeader({ title, navigation, rightAction, onRightPress }) {
  const insets = useSafeAreaInsets();
  const C = useColors();
  return (
    <View style={[headerStyles.container, { paddingTop: insets.top + Spacing.md, backgroundColor: C.surface }]}
    >
      <TouchableOpacity onPress={() => navigation.goBack()} style={[headerStyles.backBtn, { backgroundColor: C.borderLight }]}>
        <Text style={[headerStyles.backArrow, { color: C.text }]}>‹</Text>
      </TouchableOpacity>
      <View style={headerStyles.titleCenter}>
        <Text style={[headerStyles.title, { color: C.text }]}>{title}</Text>
      </View>
      {rightAction ? (
        <TouchableOpacity onPress={onRightPress} style={headerStyles.actionBtn}>
          <Text style={headerStyles.actionText}>{rightAction}</Text>
        </TouchableOpacity>
      ) : (
        <View style={{ width: 60 }} />
      )}
    </View>
  );
}

// ─── Stat Item ────────────────────────────────────────────────────
export function StatItem({ value, label, icon, color }) {
  return (
    <View style={statStyles.container}>
      {icon && <Text style={statStyles.icon}>{icon}</Text>}
      <Text style={[statStyles.value, color && { color }]}>{value}</Text>
      <Text style={statStyles.label}>{label}</Text>
    </View>
  );
}

// ─── Badge ────────────────────────────────────────────────────────
export function Badge({ text, color, small }) {
  return (
    <View style={[badgeStyles.badge, small && badgeStyles.small, color && { backgroundColor: color + '20' }]}>
      <Text style={[badgeStyles.text, small && badgeStyles.textSmall, color && { color }]}>{text}</Text>
    </View>
  );
}

// ─── Empty State ──────────────────────────────────────────────────
export function EmptyState({ icon, title, message }) {
  return (
    <View style={emptyStyles.container}>
      <Text style={emptyStyles.icon}>{icon}</Text>
      <Text style={emptyStyles.title}>{title}</Text>
      {message && <Text style={emptyStyles.message}>{message}</Text>}
    </View>
  );
}

// ─── Divider ──────────────────────────────────────────────────────
export function Divider() {
  return <View style={dividerStyles.divider} />;
}

// ─── Styles ───────────────────────────────────────────────────────

const btnStyles = StyleSheet.create({
  primary: {
    backgroundColor: Colors.primary,
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: Radii.lg,
    alignItems: 'center',
    justifyContent: 'center',
    ...Shadows.primary,
  },
  primarySmall: {
    backgroundColor: Colors.primary,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: Radii.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondary: {
    backgroundColor: Colors.surface,
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: Radii.lg,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: Colors.border,
  },
  danger: {
    backgroundColor: Colors.error + '10',
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: Radii.lg,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Colors.error + '30',
  },
  disabled: {
    opacity: 0.5,
  },
  primaryText: {
    ...Typography.body,
    color: '#fff',
    fontWeight: '700',
    fontSize: 16,
  },
  primaryTextSmall: {
    ...Typography.body,
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
  },
  secondaryText: {
    ...Typography.body,
    color: Colors.text,
    fontWeight: '600',
    fontSize: 16,
  },
  dangerText: {
    ...Typography.body,
    color: Colors.error,
    fontWeight: '600',
  },
  textBtn: {
    color: Colors.primary,
    fontWeight: '600',
    fontSize: 15,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  icon: {
    fontSize: 18,
    marginRight: 8,
  },
  iconSmall: {
    fontSize: 14,
    marginRight: 6,
  },
});

const cardStyles = StyleSheet.create({
  card: {
    backgroundColor: Colors.card,
    borderRadius: Radii.lg,
    padding: Spacing.lg,
    marginBottom: Spacing.lg,
    ...Shadows.medium,
  },
});

const headerStyles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.md,
    marginBottom: Spacing.sm,
  },
  titleBlock: {
    flex: 1,
  },
  titleCenter: {
    flex: 1,
    alignItems: 'center',
  },
  title: {
    ...Typography.h2,
  },
  subtitle: {
    ...Typography.caption,
    marginTop: 2,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: Radii.md,
    backgroundColor: Colors.borderLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backArrow: {
    fontSize: 26,
    color: Colors.text,
    fontWeight: '600',
    marginTop: -2,
  },
  actionBtn: {
    minWidth: 60,
    alignItems: 'flex-end',
    padding: Spacing.sm,
  },
  actionText: {
    ...Typography.body,
    color: Colors.primary,
    fontWeight: '600',
  },
  actionIcon: {
    fontSize: 20,
  },
});

const statStyles = StyleSheet.create({
  container: {
    alignItems: 'center',
    paddingVertical: Spacing.md,
  },
  icon: {
    fontSize: 20,
    marginBottom: Spacing.xs,
  },
  value: {
    ...Typography.stat,
  },
  label: {
    ...Typography.small,
    marginTop: 2,
  },
});

const badgeStyles = StyleSheet.create({
  badge: {
    backgroundColor: Colors.primary + '15',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: Radii.full,
    alignSelf: 'flex-start',
  },
  small: {
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  text: {
    ...Typography.label,
    color: Colors.primary,
    fontSize: 12,
  },
  textSmall: {
    fontSize: 11,
  },
});

const emptyStyles = StyleSheet.create({
  container: {
    alignItems: 'center',
    paddingVertical: 48,
    paddingHorizontal: 32,
  },
  icon: {
    fontSize: 48,
    marginBottom: Spacing.lg,
  },
  title: {
    ...Typography.h3,
    marginBottom: Spacing.sm,
    textAlign: 'center',
  },
  message: {
    ...Typography.body,
    color: Colors.textMuted,
    textAlign: 'center',
    lineHeight: 20,
  },
});

const dividerStyles = StyleSheet.create({
  divider: {
    height: 1,
    backgroundColor: Colors.border,
    marginVertical: Spacing.md,
  },
});
