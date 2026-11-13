import React from 'react';
import {
  StyleSheet,
  TouchableOpacity,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { useTheme } from 'styled-components/native';
import AppText from '../../app/ui/AppText';
import Feather from '../../components/icons/NuriFeatherIcon';
import { HomeReflectiveGlass } from '../../components/home/HomeReflectiveGlass';
import { PRODUCT_CTA } from '../../app/theme/tokens/productAccent';
import { ACTIVITY_READING_TYPE } from '../../theme/activityTypography';

export function Copy({
  children,
  title = false,
  muted = false,
}: React.PropsWithChildren<{ title?: boolean; muted?: boolean }>) {
  const theme = useTheme();
  return (
    <AppText
      preset={title ? 'unifiedTitle' : 'unifiedBody'}
      styleOverridesPreset
      style={[
        title ? ui.title : ui.body,
        {
          color: muted ? theme.colors.textSecondary : theme.colors.textPrimary,
        },
      ]}
    >
      {children}
    </AppText>
  );
}

export function Glass({
  children,
  style,
}: React.PropsWithChildren<{ style?: StyleProp<ViewStyle> }>) {
  return (
    <HomeReflectiveGlass borderRadius={8} style={[ui.glass, style]}>
      {children}
    </HomeReflectiveGlass>
  );
}

export function Row({
  title,
  subtitle,
  icon,
  onPress,
  testID,
  expanded,
}: {
  title: string;
  subtitle?: string;
  icon?: string;
  onPress: () => void;
  testID?: string;
  expanded?: boolean;
}) {
  const theme = useTheme();
  return (
    <TouchableOpacity
      testID={testID}
      accessibilityRole="button"
      accessibilityState={expanded === undefined ? undefined : { expanded }}
      onPress={onPress}
      activeOpacity={0.65}
      style={[ui.row, { borderBottomColor: theme.colors.border }]}
    >
      {icon ? (
        <Feather name={icon} size={22} color={theme.colors.textSecondary} />
      ) : null}
      <View style={ui.grow}>
        <Copy title>{title}</Copy>
        {subtitle ? <Copy muted>{subtitle}</Copy> : null}
      </View>
      <Feather
        name={
          expanded === undefined
            ? 'chevron-right'
            : expanded
            ? 'chevron-up'
            : 'chevron-down'
        }
        size={20}
        color={theme.colors.textSecondary}
      />
    </TouchableOpacity>
  );
}

export function Choices<T extends string>({
  options,
  value,
  onChange,
  label,
}: {
  options: readonly { value: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
  label: string;
}) {
  const theme = useTheme();
  return (
    <View accessibilityLabel={label} style={ui.choices}>
      {options.map(option => (
        <TouchableOpacity
          key={option.value}
          accessibilityRole="radio"
          accessibilityLabel={option.label}
          accessibilityState={{ selected: value === option.value }}
          testID={`choice-${option.value}`}
          onPress={() => onChange(option.value)}
          style={[
            ui.choice,
            {
              borderColor: theme.colors.border,
              backgroundColor:
                value === option.value
                  ? PRODUCT_CTA.subtle
                  : theme.colors.surface,
            },
          ]}
        >
          <AppText
            preset="unifiedLabel"
            style={{
              color:
                value === option.value
                  ? PRODUCT_CTA.primary
                  : theme.colors.textSecondary,
            }}
          >
            {option.label}
          </AppText>
        </TouchableOpacity>
      ))}
    </View>
  );
}

export const ui = StyleSheet.create({
  grow: { flex: 1, minWidth: 0, gap: 4 },
  title: {
    ...ACTIVITY_READING_TYPE.section,
    letterSpacing: 0,
    includeFontPadding: false,
    flexShrink: 1,
  },
  body: {
    ...ACTIVITY_READING_TYPE.label,
    letterSpacing: 0,
    includeFontPadding: false,
    flexShrink: 1,
  },
  glass: { marginTop: 0, padding: 16, gap: 16 },
  row: {
    minHeight: 64,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  choices: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  choice: {
    minHeight: 44,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 22,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
