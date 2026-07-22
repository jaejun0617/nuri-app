// 파일: src/components/weather/WeatherTemperatureNotice.tsx
// 역할:
// - 기온과 강수 상태가 산책에 영향을 줄 때 짧은 행동 안내를 보여준다.
// - 홈 카드와 날씨 상세가 같은 안전 문구와 상태 색상 계약을 사용하도록 공통화한다.

import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import type {
  WeatherPrecipitationSafety,
  WeatherTemperatureSafety,
} from '../../services/weather/guide';
import { formatWeatherPetText } from '../../services/weather/guide';

type Props = {
  safety?: WeatherTemperatureSafety;
  precipitationSafety?: WeatherPrecipitationSafety | null;
  compact?: boolean;
  textColor?: string;
  petName?: string | null;
};

type NoticePalette = {
  background: string;
  border: string;
  accent: string;
};

function getTonePalette(
  tone: WeatherTemperatureSafety['tone'],
): NoticePalette | null {
  switch (tone) {
    case 'hot':
      return {
        background: 'rgba(240, 117, 76, 0.12)',
        border: 'rgba(220, 91, 56, 0.24)',
        accent: '#C75634',
      };
    case 'cold':
      return {
        background: 'rgba(77, 143, 220, 0.13)',
        border: 'rgba(77, 143, 220, 0.26)',
        accent: '#3977BC',
      };
    case 'caution':
      return {
        background: 'rgba(224, 164, 52, 0.13)',
        border: 'rgba(201, 143, 32, 0.24)',
        accent: '#9C6B0D',
      };
    default:
      return null;
  }
}

function getPrecipitationPalette(
  kind: WeatherPrecipitationSafety['kind'],
): NoticePalette {
  if (kind === 'storm') {
    return {
      background: 'rgba(112, 108, 180, 0.13)',
      border: 'rgba(92, 87, 164, 0.28)',
      accent: '#625DB0',
    };
  }

  if (kind === 'snow') {
    return {
      background: 'rgba(77, 143, 220, 0.13)',
      border: 'rgba(77, 143, 220, 0.26)',
      accent: '#3977BC',
    };
  }

  return {
    background: 'rgba(76, 137, 168, 0.13)',
    border: 'rgba(76, 137, 168, 0.28)',
    accent: '#2F728E',
  };
}

export default React.memo(function WeatherTemperatureNotice({
  safety,
  precipitationSafety,
  compact = false,
  textColor = '#233148',
  petName,
}: Props) {
  const temperaturePalette = safety ? getTonePalette(safety.tone) : null;
  const notices = [
    precipitationSafety
      ? {
          key: `precipitation-${precipitationSafety.kind}`,
          label: precipitationSafety.label,
          message: formatWeatherPetText(precipitationSafety.message, petName),
          detail: formatWeatherPetText(precipitationSafety.detail, petName),
          palette: getPrecipitationPalette(precipitationSafety.kind),
        }
      : null,
    safety && temperaturePalette
      ? {
          key: `temperature-${safety.tone}`,
          label: safety.label,
          message: formatWeatherPetText(safety.message, petName),
          detail: formatWeatherPetText(safety.detail, petName),
          palette: temperaturePalette,
        }
      : null,
  ].filter((notice): notice is NonNullable<typeof notice> => notice !== null);

  if (notices.length === 0) return null;

  const visibleNotices = compact ? notices.slice(0, 1) : notices;
  const primaryPalette = visibleNotices[0]?.palette;

  return (
    <View
      style={[
        styles.container,
        compact ? styles.containerCompact : null,
        primaryPalette
          ? {
              backgroundColor: primaryPalette.background,
              borderColor: primaryPalette.border,
            }
          : null,
      ]}
    >
      {visibleNotices.map((notice, index) => (
        <View
          key={notice.key}
          style={[
            styles.copy,
            index > 0 ? styles.noticeDivider : null,
            { borderTopColor: notice.palette.border },
          ]}
        >
          <Text
            style={[
              styles.label,
              compact ? styles.labelCompact : null,
              { color: notice.palette.accent },
            ]}
          >
            {notice.label}
          </Text>
          <Text
            style={[
              styles.message,
              compact ? styles.messageCompact : null,
              { color: textColor },
            ]}
          >
            {notice.message}
          </Text>
          {!compact ? (
            <Text style={[styles.detail, { color: textColor }]}>
              {notice.detail}
            </Text>
          ) : null}
        </View>
      ))}
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    marginTop: 8,
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 10,
    paddingVertical: 9,
  },
  containerCompact: {
    marginTop: 2,
    paddingHorizontal: 8,
    paddingVertical: 7,
    borderRadius: 12,
  },
  copy: {
    flex: 1,
    gap: 2,
  },
  noticeDivider: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
  },
  label: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '800',
  },
  labelCompact: {
    fontSize: 11,
    lineHeight: 14,
  },
  message: {
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '700',
  },
  messageCompact: {
    fontSize: 11,
    lineHeight: 15,
    fontWeight: '700',
  },
  detail: {
    marginTop: 2,
    fontSize: 12,
    lineHeight: 17,
    fontWeight: '500',
    opacity: 0.78,
  },
});
