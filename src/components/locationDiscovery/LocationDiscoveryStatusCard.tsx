import React from 'react';
import { ActivityIndicator, Linking, TouchableOpacity, View } from 'react-native';
import Feather from 'react-native-vector-icons/Feather';

import AppText from '../../app/ui/AppText';
import type { LocationPermissionStatus } from '../../services/location/permission';
import { styles } from './LocationDiscovery.styles';

type Props = {
  title: string;
  body: string;
  icon: string;
  loading?: boolean;
  actionLabel?: string;
  onPressAction?: () => void;
};

export function LocationDiscoveryStatusCard({
  title,
  body,
  icon,
  loading = false,
  actionLabel,
  onPressAction,
}: Props) {
  return (
    <View style={styles.emptyCard}>
      {loading ? (
        <ActivityIndicator size="small" color="#6D6AF8" />
      ) : (
        <Feather name={icon as never} size={24} color="#6D6AF8" />
      )}
      <AppText preset="headline" style={styles.emptyTitle}>
        {title}
      </AppText>
      <AppText preset="body" style={styles.emptyDesc}>
        {body}
      </AppText>
      {actionLabel && onPressAction ? (
        <TouchableOpacity
          activeOpacity={0.9}
          style={styles.primaryActionButton}
          onPress={onPressAction}
        >
          <AppText preset="body" style={styles.primaryActionButtonText}>
            {actionLabel}
          </AppText>
        </TouchableOpacity>
      ) : null}
    </View>
  );
}

export function buildLocationPermissionCopy(
  permission: LocationPermissionStatus,
): Pick<Props, 'title' | 'body' | 'actionLabel' | 'onPressAction'> {
  if (permission === 'blocked') {
    return {
      title: '위치 권한이 꺼져 있어요',
      body: '설정에서 위치 권한을 켜면 주변 추천을 더 정확하게 보여드릴 수 있어요. 검색은 계속 사용할 수 있어요.',
      actionLabel: '설정 열기',
      onPressAction: () => {
        Linking.openSettings().catch(() => {});
      },
    };
  }

  return {
    title: '현재 위치를 아직 확인하지 못했어요',
    body: '권한을 허용하면 주변 장소를 먼저 추천해 드려요. 지금은 검색으로도 탐색할 수 있어요.',
  };
}
