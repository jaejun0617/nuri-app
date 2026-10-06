import CtaButton, { CtaText } from '../../app/ui/CtaButton';
import type { CtaRole } from '../../app/theme/ctaPalette';
import React from 'react';
import { ActivityIndicator, Linking, View } from 'react-native';
import Feather from '../icons/NuriFeatherIcon';

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
  actionRole?: CtaRole;
};

export function LocationDiscoveryStatusCard({
  title,
  body,
  icon,
  loading = false,
  actionLabel,
  onPressAction,
  actionRole = 'primary',
}: Props) {
  return (
    <View style={styles.emptyCard}>
      {loading ? (
        <ActivityIndicator size="small" color="#6D6AF8" />
      ) : (
        <Feather name={icon as never} size={24} color="#6D6AF8" />
      )}
      <AppText
        typographyRole="celebration"
        preset="unifiedTitle"
        style={styles.emptyTitle}
      >
        {title}
      </AppText>
      <AppText preset="unifiedBody" style={styles.emptyDesc}>
        {body}
      </AppText>
      {actionLabel && onPressAction ? (
        <CtaButton
          role={actionRole}
          activeOpacity={0.9}
          style={styles.primaryActionButton}
          onPress={onPressAction}
        >
          <CtaText preset="unifiedBody" style={styles.primaryActionButtonText}>
            {actionLabel}
          </CtaText>
        </CtaButton>
      ) : null}
    </View>
  );
}

export function buildLocationPermissionCopy(
  permission: LocationPermissionStatus,
): Pick<
  Props,
  'title' | 'body' | 'actionLabel' | 'onPressAction' | 'actionRole'
> {
  if (permission === 'blocked') {
    return {
      title: '위치 권한이 꺼져 있어요',
      body: '설정에서 위치 권한을 켜면 주변 추천을 더 정확하게 보여드릴 수 있어요. 검색은 계속 사용할 수 있어요.',
      actionLabel: '설정 열기',
      actionRole: 'secondary',
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
