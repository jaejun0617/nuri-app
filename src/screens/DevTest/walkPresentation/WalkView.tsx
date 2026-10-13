import React from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  View,
  useWindowDimensions,
} from 'react-native';
import styled, { useTheme } from 'styled-components/native';
import AppText from '../../../app/ui/AppText';
import Feather from '../../../components/icons/NuriFeatherIcon';
import {
  resolveCtaPalette,
  SEASON_CTA,
  type CtaRole,
} from '../../../app/theme/ctaPalette';
import type { SeasonKey } from '../../../theme/seasonal/season';
import {
  averageSpeed,
  metricDistance,
  metricTime,
  WALK_COPY,
  type PresentationState,
} from './model';

const Surface = styled.View`
  background-color: ${({ theme }) => theme.colors.surfaceElevated};
`;
const Root = styled.View`
  flex: 1;
  background-color: ${({ theme }) => theme.colors.surface};
`;
const Header = styled(Surface)`
  padding: 8px 16px;
  flex-direction: row;
  align-items: center;
  gap: 12px;
`;
const Bottom = styled(Surface)`
  padding: 18px 20px;
  border-top-width: 1px;
  border-color: ${({ theme }) => theme.colors.border};
  gap: 14px;
`;
const Chip = styled.View<{ $accent: string }>`
  padding: 6px 10px;
  background-color: ${({ $accent }) => $accent};
  border-radius: 8px;
  align-self: flex-start;
`;
const Hint = styled(Surface)`
  margin: 16px;
  padding: 14px;
  border-radius: 8px;
  flex-direction: row;
  gap: 10px;
`;
const Panel = styled(Surface)`
  padding: 24px;
  gap: 16px;
  border-radius: 8px;
  width: 100%;
  max-width: 480px;
`;
type ActionProps = {
  label: string;
  icon: string;
  season: SeasonKey;
  onPress?: () => void;
  disabled?: boolean;
  role?: CtaRole;
  testID?: string;
};
export function WalkAction({
  label,
  icon,
  season,
  onPress,
  disabled,
  role = 'primary',
  testID,
}: ActionProps) {
  const theme = useTheme();
  return (
    <Pressable
      testID={testID}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: !!disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => {
        const palette = resolveCtaPalette({
          role,
          season,
          colorScheme: theme.mode,
          colors: theme.colors,
          state: disabled ? 'disabled' : pressed ? 'pressed' : 'default',
        });
        return [
          styles.action,
          { backgroundColor: palette.background, borderColor: palette.border },
        ];
      }}
    >
      <Feather
        name={icon}
        size={20}
        color={
          resolveCtaPalette({
            role,
            season,
            colorScheme: theme.mode,
            colors: theme.colors,
            state: disabled ? 'disabled' : 'default',
          }).text
        }
      />
      <AppText
        preset="button"
        style={{
          color: resolveCtaPalette({
            role,
            season,
            colorScheme: theme.mode,
            colors: theme.colors,
            state: disabled ? 'disabled' : 'default',
          }).text,
          flexShrink: 1,
          textAlign: 'center',
        }}
      >
        {label}
      </AppText>
    </Pressable>
  );
}
export function IconControl({
  label,
  icon,
  onPress,
  testID,
}: {
  label: string;
  icon: string;
  onPress: () => void;
  testID?: string;
}) {
  const theme = useTheme();
  return (
    <Pressable
      testID={testID}
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      style={({ pressed }) => [
        styles.icon,
        {
          backgroundColor: theme.colors.surfaceElevated,
          opacity: pressed ? 0.7 : 1,
        },
      ]}
    >
      <Feather name={icon} size={22} color={theme.colors.textPrimary} />
    </Pressable>
  );
}
type Props = {
  state: PresentationState;
  petName: string;
  season: SeasonKey;
  preview: boolean;
  distanceM: string | null;
  activeMs: string;
  busy: boolean;
  map: React.ReactNode;
  insetTop: number;
  insetBottom: number;
  freeLook: boolean;
  error: boolean;
  qualityLabel: string;
  onClose: () => void;
  onQa: () => void;
  onRecenter: () => void;
  onPrimary: () => void;
  onFinish: () => void;
  onCancelFinish: () => void;
};
export default function WalkView(props: Props) {
  const { state, petName, season, preview, distanceM, activeMs, busy } = props;
  const theme = useTheme(),
    { width, fontScale } = useWindowDimensions();
  const copy = WALK_COPY[state],
    seasonal = SEASON_CTA[season];
  const result =
    state === 'FINISHED_LOCAL' || state === 'FUTURE_RECORD_CTA_PREVIEW';
  const paused = state === 'PAUSED',
    recovery = state === 'RECOVERY_REQUIRED';
  const pre = state === 'PRE_WALK',
    confirm = state === 'FINISH_CONFIRM';
  const stateLabel = state === 'WALKING' ? `${petName}와 걷는 중` : copy.title;
  const primary = result
    ? '산책 화면 닫기'
    : pre
    ? '함께 산책 시작하기'
    : recovery
    ? '산책 이어가기'
    : paused
    ? '산책 계속하기'
    : '잠시 쉬기';
  return (
    <Root testID="walk-product-screen">
      <Header style={{ paddingTop: props.insetTop + 8 }}>
        <IconControl
          label="산책 화면 닫기"
          icon="chevron-down"
          onPress={props.onClose}
          testID="walk-close"
        />
        <View style={styles.headerText}>
          <AppText preset="titleSm">누리랑 산책</AppText>
          <AppText
            preset="bodySm"
            numberOfLines={2}
            style={{ color: theme.colors.textSecondary }}
          >
            {petName}
          </AppText>
        </View>
        <IconControl
          label="QA 정보 열기"
          icon="sliders"
          onPress={props.onQa}
          testID="walk-qa-open"
        />
      </Header>
      <View style={styles.mapStage}>
        {props.map}
        <View
          pointerEvents="none"
          style={styles.mapTop}
          testID="walk-mode-label-layer"
        >
          {preview && (
            <Chip $accent={theme.colors.surfaceElevated}>
              <AppText
                preset="caption"
                style={{ color: theme.colors.textPrimary }}
              >
                합성 미리보기
              </AppText>
            </Chip>
          )}
          {['GPS_ACQUIRING', 'GPS_WEAK', 'GPS_LOST'].includes(state) && (
            <Hint>
              <Feather
                name={copy.icon}
                size={20}
                color={theme.colors.textPrimary}
              />
              <View style={styles.flex}>
                <AppText preset="bodyStrong">{copy.title}</AppText>
                <AppText
                  preset="bodySm"
                  style={{ color: theme.colors.textSecondary }}
                >
                  {copy.supporting}
                </AppText>
              </View>
            </Hint>
          )}
        </View>
        {paused && (
          <View pointerEvents="none" style={styles.dim}>
            <Chip $accent={theme.colors.surfaceElevated}>
              <AppText preset="titleMd">잠시 쉬는 중</AppText>
            </Chip>
          </View>
        )}
        {(pre || recovery || confirm || result) && (
          <View style={styles.center} testID="walk-state-overlay">
            <ScrollView
              contentContainerStyle={styles.centerContent}
              showsVerticalScrollIndicator={false}
            >
              <Panel>
                <Feather name={copy.icon} size={30} color={seasonal.primary} />
                <AppText preset="titleLg" accessibilityRole="header">
                  {copy.title}
                </AppText>
                <AppText
                  preset="bodySm"
                  style={{ color: theme.colors.textSecondary }}
                >
                  {copy.supporting}
                </AppText>
                {(result || confirm || recovery) && (
                  <AppText preset="display" fontModeOverride="pretendard">
                    {metricDistance(distanceM)} km · {metricTime(activeMs)}
                  </AppText>
                )}
                {result && (
                  <AppText preset="bodySm">
                    평균 {averageSpeed(distanceM, activeMs)} km/h
                  </AppText>
                )}
                {result && (
                  <AppText preset="bodySm">{props.qualityLabel}</AppText>
                )}
                {confirm && (
                  <>
                    <WalkAction
                      label="산책 마치기"
                      icon="flag"
                      season={season}
                      role="destructiveConfirm"
                      onPress={props.onFinish}
                      disabled={busy}
                      testID="walk-finish-confirm"
                    />
                    <WalkAction
                      label="계속 걷기"
                      icon="arrow-left"
                      season={season}
                      role="secondary"
                      onPress={props.onCancelFinish}
                      testID="walk-finish-cancel"
                    />
                  </>
                )}
                {state === 'FUTURE_RECORD_CTA_PREVIEW' && (
                  <>
                    <AppText preset="caption">향후 기록 연결 시안</AppText>
                    <WalkAction
                      label="산책 기록으로 남기기"
                      icon="edit-3"
                      season={season}
                      disabled
                    />
                    <WalkAction
                      label="나중에 기록하기"
                      icon="clock"
                      season={season}
                      disabled
                    />
                  </>
                )}
              </Panel>
            </ScrollView>
          </View>
        )}
        {!pre && !recovery && !confirm && !result && (
          <View style={styles.recenter}>
            <IconControl
              label="내 위치로 돌아가기"
              icon="crosshair"
              onPress={props.onRecenter}
              testID="walk-recenter"
            />
            {props.freeLook && (
              <Chip $accent={theme.colors.surfaceElevated}>
                <AppText preset="caption">지도 둘러보기</AppText>
              </Chip>
            )}
          </View>
        )}
      </View>
      {!confirm && (
        <Bottom style={{ paddingBottom: props.insetBottom + 12 }}>
          <View style={styles.stateLine}>
            <View style={styles.flex}>
              <AppText
                preset="titleSm"
                numberOfLines={2}
                accessibilityLiveRegion="polite"
              >
                {stateLabel}
              </AppText>
              <AppText
                preset="caption"
                style={{ color: theme.colors.textSecondary }}
              >
                {paused
                  ? '시간과 거리 기록을 멈췄어요'
                  : result
                  ? '기기 저장 완료'
                  : pre
                  ? '준비되면 시작해 주세요'
                  : state === 'GPS_ACQUIRING'
                  ? '신호 대기 중'
                  : ['GPS_WEAK', 'GPS_LOST'].includes(state)
                  ? '위치 신호 확인 중'
                  : 'GPS 기록 중'}
              </AppText>
            </View>
            <Feather name={copy.icon} size={22} color={seasonal.primary} />
          </View>
          {!pre && !result && (
            <View style={styles.metrics}>
              <View style={styles.metric}>
                <AppText
                  preset="caption"
                  style={{ color: theme.colors.textSecondary }}
                >
                  함께 걸은 거리
                </AppText>
                <AppText
                  preset="display"
                  fontModeOverride="pretendard"
                  style={styles.distance}
                >
                  {metricDistance(distanceM)}
                  <AppText preset="bodySm"> km</AppText>
                </AppText>
              </View>
              <View style={styles.metric}>
                <AppText
                  preset="caption"
                  style={{ color: theme.colors.textSecondary }}
                >
                  산책 시간
                </AppText>
                <AppText preset="titleLg" fontModeOverride="pretendard">
                  {metricTime(activeMs)}
                </AppText>
              </View>
            </View>
          )}
          {props.error && (
            <AppText preset="bodySm" accessibilityLiveRegion="polite">
              지금 요청을 완료하지 못했어요. 산책 상태를 확인한 뒤 다시 시도해
              주세요.
            </AppText>
          )}
          <View
            style={[
              styles.controls,
              (width < 380 || fontScale >= 1.3) && styles.stack,
            ]}
          >
            <View style={styles.flex}>
              <WalkAction
                label={primary}
                icon={
                  result ? 'home' : paused || recovery || pre ? 'play' : 'pause'
                }
                season={season}
                disabled={busy}
                onPress={props.onPrimary}
                testID="walk-primary"
              />
            </View>
            {!pre && !result && (
              <View style={styles.flex}>
                <WalkAction
                  label={recovery ? '여기서 산책 마치기' : '산책 종료'}
                  icon="flag"
                  season={season}
                  role="destructiveEntry"
                  onPress={props.onFinish}
                  disabled={busy}
                  testID="walk-finish"
                />
              </View>
            )}
          </View>
        </Bottom>
      )}
    </Root>
  );
}
const styles = StyleSheet.create({
  flex: { flex: 1, minWidth: 0 },
  headerText: { flex: 1, minWidth: 0 },
  icon: {
    minWidth: 48,
    minHeight: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  action: {
    minHeight: 56,
    borderRadius: 8,
    borderWidth: 1,
    paddingVertical: 14,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  mapStage: { flex: 1, minHeight: 180 },
  mapTop: { position: 'absolute', top: 12, left: 16, right: 16, zIndex: 2 },
  dim: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(11,18,32,0.18)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  center: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(246,247,251,0.88)',
    zIndex: 1,
  },
  centerContent: {
    padding: 20,
    flexGrow: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  recenter: {
    position: 'absolute',
    bottom: 16,
    right: 16,
    gap: 6,
    alignItems: 'flex-end',
  },
  stateLine: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  metrics: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  metric: { flex: 1, minWidth: 0, gap: 4 },
  distance: { fontSize: 40, lineHeight: 48, letterSpacing: 0 },
  controls: { flexDirection: 'row', gap: 12 },
  stack: { flexDirection: 'column' },
});
