import React from 'react';
import { Image, Pressable, StyleSheet, View } from 'react-native';
import { useTheme } from 'styled-components/native';
import Feather from '../../components/icons/NuriFeatherIcon';
import { PRODUCT_CTA } from '../../app/theme/tokens/productAccent';
import { getKstDateParts } from '../../utils/date';
import { Copy, Glass, ui } from './PreviewPrimitives';

export function InquiryArtwork({
  size,
  testID,
}: {
  size: number;
  testID?: string;
}) {
  return (
    <Image
      testID={testID}
      source={require('../../assets/support/inquiry-maltese-v1.png')}
      style={{ width: size, height: size, flexShrink: 0 }}
      resizeMode="contain"
      accessible={false}
    />
  );
}

export function inquiryDate(value: string, includeTime = false) {
  const date = getKstDateParts(value);
  if (!date) return null;
  const pad = (number: number) => String(number).padStart(2, '0');
  const day = `${date.year}.${pad(date.month)}.${pad(date.day)}`;
  return includeTime
    ? `${day} · ${date.hour < 12 ? '오전' : '오후'} ${
        date.hour % 12 || 12
      }:${pad(date.minute)}`
    : day;
}

export function InquiryStatus({
  label,
  accent = false,
}: {
  label: string;
  accent?: boolean;
}) {
  const theme = useTheme();
  return (
    <View
      style={[
        styles.status,
        {
          backgroundColor:
            accent && theme.mode !== 'dark'
              ? PRODUCT_CTA.subtle
              : theme.colors.surface,
          borderColor:
            accent && theme.mode !== 'dark'
              ? PRODUCT_CTA.border
              : theme.colors.border,
        },
      ]}
    >
      <Copy muted={!accent}>{label}</Copy>
    </View>
  );
}

export function InquiryHeading({
  title,
  subtitle,
}: {
  title: string;
  subtitle?: string;
}) {
  return (
    <View style={styles.heading}>
      <View style={ui.grow}>
        <Copy title>{title}</Copy>
        {subtitle ? <Copy muted>{subtitle}</Copy> : null}
      </View>
      <InquiryArtwork size={72} />
    </View>
  );
}

export function InquiryListItem({
  title,
  status,
  date,
  summary,
  unread = false,
  disabled = false,
  onPress,
  testID,
}: {
  title: string;
  status: string;
  date?: string | null;
  summary?: string;
  unread?: boolean;
  disabled?: boolean;
  onPress: () => void;
  testID?: string;
}) {
  const theme = useTheme();
  return (
    <Glass style={styles.card}>
      <Pressable
        testID={testID}
        accessibilityRole="button"
        accessibilityState={{ disabled }}
        disabled={disabled}
        onPress={onPress}
        style={({ pressed }) => [styles.listItem, pressed && styles.pressed]}
      >
        <View style={ui.grow}>
          <View style={styles.meta}>
            <InquiryStatus label={status} accent={unread} />
            {date ? <Copy muted>{date}</Copy> : null}
          </View>
          <Copy title>{title}</Copy>
          {summary ? <Copy muted>{summary}</Copy> : null}
        </View>
        <Feather
          name="chevron-right"
          size={20}
          color={theme.colors.textSecondary}
          accessible={false}
        />
      </Pressable>
    </Glass>
  );
}

export function InquiryMessage({
  children,
  outgoing,
  name,
  date,
  showAvatar = false,
  testID,
}: React.PropsWithChildren<{
  outgoing: boolean;
  name: string;
  date?: string | null;
  showAvatar?: boolean;
  testID?: string;
}>) {
  const theme = useTheme();
  const line = theme.mode === 'dark' ? theme.colors.border : PRODUCT_CTA.border;
  return (
    <View
      testID={testID}
      style={[styles.messageRow, outgoing && styles.outgoingRow]}
    >
      {showAvatar ? <InquiryArtwork size={38} /> : null}
      <View style={[styles.message, outgoing && styles.outgoing]}>
        <Copy muted>{name}</Copy>
        {outgoing ? (
          <View
            style={[
              styles.bubble,
              {
                borderRadius: 8,
                backgroundColor:
                  theme.mode === 'dark'
                    ? theme.colors.surface
                    : PRODUCT_CTA.subtle,
                borderColor: line,
              },
            ]}
          >
            {children}
          </View>
        ) : (
          <Glass style={styles.bubble}>{children}</Glass>
        )}
        {date ? <Copy muted>{date}</Copy> : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  heading: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    minHeight: 72,
  },
  status: {
    alignSelf: 'flex-start',
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  card: { padding: 0 },
  listItem: {
    minHeight: 64,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
  },
  pressed: { opacity: 0.72 },
  meta: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 4,
  },
  messageRow: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'flex-start',
    alignSelf: 'stretch',
  },
  outgoingRow: { justifyContent: 'flex-end' },
  message: {
    maxWidth: '85%',
    minWidth: 0,
    flexShrink: 1,
    alignItems: 'flex-start',
    gap: 5,
  },
  outgoing: { alignItems: 'flex-end' },
  bubble: {
    minWidth: 0,
    maxWidth: '100%',
    paddingHorizontal: 13,
    paddingVertical: 10,
    gap: 8,
    borderWidth: StyleSheet.hairlineWidth,
  },
});
