import React from 'react';
import {
  Pressable,
  Image,
  ScrollView,
  StyleSheet,
  View,
  useWindowDimensions,
} from 'react-native';
import styled, { useTheme } from 'styled-components/native';
import AppText from '../../../app/ui/AppText';
import Feather from '../../../components/icons/NuriFeatherIcon';
import NuriSemanticIcon from '../../../components/icons/NuriSemanticIcon';
import { formatPetCopy } from '../../../utils/petDisplayName';
import {
  resolveCtaPalette,
  SEASON_CTA,
  type CtaRole,
} from '../../../app/theme/ctaPalette';
import type { SeasonKey } from '../../../theme/seasonal/season';
import { metricDistance, WALK_COPY, type PresentationState } from './model';
import { WALK_SHEET_OVERLAP, WALK_TEXT } from './visuals';
import WalkWeatherChip from './WalkWeatherChip';
import WalkElapsedMetric from './WalkElapsedMetric';
import WalkPreWalk from './WalkPreWalk';
import WalkFinishSheet from './WalkFinishSheet';
import WalkLocalResult from './WalkLocalResult';
import WalkSignalStatus from './WalkSignalStatus';
import { finishArtwork } from './finishArtwork';
import { lightColors } from '../../../app/theme/tokens/colors';
import { walkCopyAccent } from './walkAccent';

const Surface = styled.View`
  background-color: ${({ theme }) => theme.colors.surfaceElevated};
`;
const Root = styled.View`
  flex: 1;
  background-color: ${({ theme }) => theme.colors.background};
`;
const Header = styled(Surface)`
  padding: 8px 16px;
  flex-direction: row;
  align-items: center;
  gap: 12px;
`;
const Bottom = styled(Surface)`
  border-top-left-radius: 28px;
  border-top-right-radius: 28px;
  overflow: hidden;
`;
const Chip = styled.View<{ $accent: string }>`
  padding: 6px 10px;
  background-color: ${({ $accent }) => $accent};
  border-radius: 8px;
  align-self: flex-start;
`;
function WalkContextRow({
  copy,
  season,
  paused = false,
}: {
  copy: string;
  season: SeasonKey;
  paused?: boolean;
}) {
  const theme = useTheme();
  return (
    <View testID="walk-context-row" style={styles.stateLine}>
      <View
        testID={paused ? 'walk-paused-status' : undefined}
        style={[
          styles.flex,
          paused && {
            borderLeftWidth: 3,
            borderLeftColor: walkCopyAccent(season, theme.mode === 'dark'),
            paddingLeft: 10,
            paddingVertical: 6,
          },
        ]}
      >
        <AppText
          testID="walk-supporting-copy"
          preset="caption"
          accessibilityLiveRegion="polite"
          style={[
            WALK_TEXT.caption,
            { color: walkCopyAccent(season, theme.mode === 'dark') },
          ]}
        >
          {copy}
        </AppText>
      </View>
      <View style={styles.contextWeather}>
        <WalkWeatherChip />
      </View>
    </View>
  );
}
type ActionProps = {
  label: string;
  icon?: string;
  season: SeasonKey;
  onPress?: () => void;
  disabled?: boolean;
  role?: CtaRole;
  testID?: string;
  outlined?: boolean;
  filled?: boolean;
  readOnly?: boolean;
};
export function WalkAction({
  label,
  icon,
  season,
  onPress,
  disabled,
  role = 'primary',
  testID,
  outlined = false,
  filled = false,
  readOnly = false,
}: ActionProps) {
  const theme = useTheme();
  const visualRole = filled && role === 'primarySubtle' ? 'primary' : role;
  const palette = resolveCtaPalette({
    role: visualRole,
    season,
    colorScheme: theme.mode,
    colors: theme.colors,
    state: disabled ? 'disabled' : 'default',
  });
  if (outlined) {
    const destructive =
      role === 'destructiveEntry' || role === 'destructiveConfirm';
    return (
      <Pressable
        testID={testID}
        accessibilityRole="button"
        accessibilityLabel={label}
        accessibilityState={{ disabled: !!disabled || readOnly }}
        disabled={disabled || readOnly}
        onPress={readOnly ? undefined : onPress}
        style={() => styles.controlTarget}
      >
        {({ pressed }) => {
          const currentPalette = resolveCtaPalette({
            role: visualRole,
            season,
            colorScheme: theme.mode,
            colors: theme.colors,
            state: disabled ? 'disabled' : pressed ? 'pressed' : 'default',
          });
          return (
            <View
              testID={`${testID}-face`}
              style={[
                styles.controlFace,
                {
                  backgroundColor:
                    disabled || filled
                      ? currentPalette.background
                      : pressed
                      ? theme.colors.surface
                      : theme.colors.background,
                  borderColor:
                    filled && !disabled
                      ? currentPalette.border
                      : theme.colors.border,
                },
              ]}
            >
              {icon && (
                <View
                  testID={`${testID}-icon-slot`}
                  style={[
                    styles.controlIcon,
                    filled && !disabled && styles.filledControlIcon,
                    filled && !disabled && { backgroundColor: palette.text },
                  ]}
                >
                  <NuriSemanticIcon
                    family="feather"
                    preserveOriginal
                    name={icon}
                    size={20}
                    testID={`${testID}-icon`}
                    accessible={false}
                    color={
                      disabled || destructive
                        ? palette.text
                        : SEASON_CTA[season].primary
                    }
                    style={[
                      styles.controlGlyph,
                      icon === 'play' && styles.playGlyph,
                    ]}
                  />
                </View>
              )}
              <AppText
                testID={testID ? `${testID}-label` : undefined}
                preset="button"
                style={[
                  WALK_TEXT.action,
                  styles.controlLabel,
                  {
                    color:
                      disabled || destructive || filled
                        ? palette.text
                        : theme.colors.textPrimary,
                  },
                ]}
              >
                {label}
              </AppText>
            </View>
          );
        }}
      </Pressable>
    );
  }
  return (
    <Pressable
      testID={testID}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: !!disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => {
        const pressedPalette = resolveCtaPalette({
          role,
          season,
          colorScheme: theme.mode,
          colors: theme.colors,
          state: disabled ? 'disabled' : pressed ? 'pressed' : 'default',
        });
        return [
          styles.action,
          {
            backgroundColor: pressedPalette.background,
            borderColor: pressedPalette.border,
          },
        ];
      }}
    >
      {icon && (
        <View>
          <Feather
            name={icon}
            size={20}
            accessible={false}
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
        </View>
      )}
      <View style={styles.actionText}>
        <AppText
          testID={testID ? `${testID}-label` : undefined}
          preset="button"
          style={[
            WALK_TEXT.action,
            {
              color: resolveCtaPalette({
                role,
                season,
                colorScheme: theme.mode,
                colors: theme.colors,
                state: disabled ? 'disabled' : 'default',
              }).text,
              flexShrink: 1,
              textAlign: 'center',
            },
          ]}
        >
          {label}
        </AppText>
      </View>
    </Pressable>
  );
}
export function IconControl({
  label,
  icon,
  onPress,
  testID,
  paper = false,
}: {
  label: string;
  icon: string;
  onPress: () => void;
  testID?: string;
  paper?: boolean;
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
          backgroundColor: paper
            ? lightColors.surfaceElevated
            : theme.colors.surfaceElevated,
          opacity: pressed ? 0.7 : 1,
        },
      ]}
    >
      <Feather
        name={icon}
        size={22}
        color={paper ? lightColors.textPrimary : theme.colors.textPrimary}
      />
    </Pressable>
  );
}
type Props = {
  productStatus?: React.ComponentProps<typeof WalkLocalResult>['productStatus'];
  productContent?: React.ReactNode;
  preWalkIntroSeen?: { current: boolean };
  state: PresentationState;
  petName: string;
  season: SeasonKey;
  preview: boolean;
  publicPreview?: boolean;
  designReview?: boolean;
  designMessage?: string;
  distanceM: string | null;
  activeMs: string;
  clockSessionKey?: string | null;
  clockRunning?: boolean;
  busy: boolean;
  map: React.ReactNode;
  insetTop: number;
  insetBottom: number;
  freeLook: boolean;
  error: boolean;
  qualityLabel: string;
  qualityNeedsReview?: boolean;
  routeAvailable?: boolean;
  routePartial?: boolean;
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
    { width, height, fontScale } = useWindowDimensions();
  const copyAccent = walkCopyAccent(season, theme.mode === 'dark');
  const copy = WALK_COPY[state];
  const result =
    state === 'FINISHED_LOCAL' || state === 'FUTURE_RECORD_CTA_PREVIEW';
  const paused = state === 'PAUSED',
    recovery = state === 'RECOVERY_REQUIRED';
  const pre = state === 'PRE_WALK',
    confirm = state === 'FINISH_CONFIRM';
  const acquiring = state === 'GPS_ACQUIRING';
  const signalIssue = state === 'GPS_WEAK' || state === 'GPS_LOST';
  const paper = pre || result || acquiring;
  const supporting = props.designReview
    ? props.designMessage ?? copy.supporting
    : paused
    ? '시간과 거리 기록을 멈췄어요'
    : acquiring
    ? '함께 걸을 준비를 하고 있어요.'
    : signalIssue
    ? '함께하는 발걸음을 소중히 기록해요.'
    : recovery
    ? '이어가기를 누르기 전에는 기록하지 않아요.'
    : copy.supporting;
  const stacked = width < 380 || fontScale >= 1.3;
  const primary = result
    ? '산책 화면 닫기'
    : pre
    ? '함께 산책 시작하기'
    : recovery
    ? '산책 이어가기'
    : paused
    ? '산책 계속하기'
    : '잠시 쉬기';
  const header = (
    <Header
      style={[
        { paddingTop: props.insetTop + 8 },
        paper && { backgroundColor: lightColors.surfaceElevated },
      ]}
    >
      <IconControl
        label="산책 화면 닫기"
        icon="arrow-left"
        onPress={props.onClose}
        testID="walk-close"
        paper={paper}
      />
      <View style={styles.headerText}>
        <AppText
          preset="titleSm"
          style={[WALK_TEXT.title, paper && { color: lightColors.textPrimary }]}
          testID="walk-header-title"
        >
          오늘의 산책
        </AppText>
        <AppText
          preset="bodySm"
          numberOfLines={2}
          testID="walk-header-pet"
          style={[
            WALK_TEXT.body,
            { color: theme.colors.textSecondary },
            paper && {
              fontSize: 12,
              lineHeight: 18,
              color: lightColors.textSecondary,
            },
          ]}
        >
          {formatPetCopy('우리 아이와 함께', petName)}
        </AppText>
      </View>
      <IconControl
        label="QA 정보 열기"
        icon="sliders"
        onPress={props.onQa}
        testID="walk-qa-open"
        paper={paper}
      />
    </Header>
  );
  if (pre) {
    return (
      <WalkPreWalk
        header={header}
        petName={petName}
        season={season}
        insetBottom={props.insetBottom}
        busy={busy}
        error={props.error}
        introSeen={props.preWalkIntroSeen}
        onPrimary={props.onPrimary}
      />
    );
  }
  if (result) {
    return (
      <WalkLocalResult
        productStatus={props.productStatus}
        productContent={props.productContent}
        header={header}
        map={props.map}
        petName={petName}
        season={season}
        distanceM={distanceM}
        activeMs={activeMs}
        sessionKey={props.clockSessionKey}
        routeAvailable={props.routeAvailable ?? preview}
        routePartial={props.routePartial}
        qualityNeedsReview={!!props.qualityNeedsReview}
        insetBottom={props.insetBottom}
        busy={busy}
        onClose={props.onPrimary}
        fixtureOnly={state === 'FUTURE_RECORD_CTA_PREVIEW'}
        fixtureContext={
          state === 'FUTURE_RECORD_CTA_PREVIEW' ? (
            <WalkContextRow copy="기록 연결은 준비 중이에요." season={season} />
          ) : undefined
        }
      />
    );
  }
  return (
    <Root testID="walk-product-screen">
      {header}
      <View style={[styles.mapStage, recovery && styles.recoveryMap]}>
        {acquiring ? (
          <ScrollView
            contentContainerStyle={styles.acquiringContent}
            showsVerticalScrollIndicator={false}
          >
            <View
              testID="walk-acquiring-artwork-frame"
              style={styles.acquiringArt}
            >
              <Image
                testID="walk-acquiring-artwork"
                source={require('../../../assets/images/walk/gps-acquiring-companions-v1.png')}
                resizeMode="contain"
                accessible={false}
                style={styles.containedArt}
              />
            </View>
            <AppText
              preset="titleSm"
              style={[styles.stateTitle, { color: copyAccent }]}
            >
              함께 걸을 준비를 해요
            </AppText>
          </ScrollView>
        ) : (
          props.map
        )}
        <View
          pointerEvents="none"
          style={styles.mapTop}
          testID="walk-mode-label-layer"
        >
          {props.designReview && (
            <Chip $accent={theme.colors.surfaceElevated}>
              <AppText
                preset="caption"
                style={[WALK_TEXT.caption, { color: theme.colors.textPrimary }]}
              >
                현재 위치 · 디자인 확인
              </AppText>
            </Chip>
          )}
        </View>
        {paused && <View pointerEvents="none" style={styles.dim} />}
        {recovery && <View pointerEvents="none" style={styles.dim} />}
        {!pre && !recovery && !confirm && !result && !acquiring && (
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
        <Bottom
          testID="walk-bottom-sheet"
          style={{
            maxHeight: height * (recovery ? 0.76 : 0.56),
            marginTop: -WALK_SHEET_OVERLAP,
          }}
        >
          <ScrollView
            bounces={false}
            showsVerticalScrollIndicator={false}
            style={styles.sheetScroll}
            contentContainerStyle={styles.bottomContent}
          >
            {recovery && (
              <View style={styles.recoveryContent}>
                <View
                  testID="walk-recovery-artwork-frame"
                  style={styles.recoveryArt}
                >
                  <Image
                    testID="walk-recovery-artwork"
                    source={
                      season === 'autumn'
                        ? require('../../../assets/images/walk/recovery-autumn-v1.png')
                        : finishArtwork(season, true)
                    }
                    resizeMode="contain"
                    accessible={false}
                    style={styles.containedArt}
                  />
                </View>
                <AppText
                  preset="titleSm"
                  accessibilityRole="header"
                  style={[styles.stateTitle, { color: copyAccent }]}
                >
                  함께 걷던 길, 이어갈까요?
                </AppText>
                <AppText preset="bodySm" style={styles.recoveryCopy}>
                  {'마지막으로 저장한 지점부터\n다시 함께 걸을 수 있어요.'}
                </AppText>
              </View>
            )}
            {(acquiring || signalIssue) && (
              <WalkSignalStatus
                state={state as 'GPS_ACQUIRING' | 'GPS_WEAK' | 'GPS_LOST'}
                season={season}
              />
            )}
            {!pre && !result && (
              <WalkContextRow
                copy={supporting}
                season={season}
                paused={paused}
              />
            )}
            {!pre && !result && (
              <View style={styles.metrics}>
                <View testID="walk-distance-group" style={styles.metricGroup}>
                  <View style={styles.metric}>
                    <AppText
                      preset="caption"
                      testID="walk-distance-label"
                      style={[
                        WALK_TEXT.caption,
                        {
                          color: theme.colors.textSecondary,
                          textAlign: 'center',
                        },
                      ]}
                    >
                      함께 걸은 거리
                    </AppText>
                    <AppText
                      preset="display"
                      fontModeOverride="pretendard"
                      style={[
                        WALK_TEXT.metric,
                        styles.metricValue,
                        { color: copyAccent },
                      ]}
                      testID="walk-distance-value"
                    >
                      {metricDistance(distanceM)}
                      <AppText
                        preset="bodySm"
                        style={[WALK_TEXT.body, { color: copyAccent }]}
                      >
                        {' '}
                        km
                      </AppText>
                    </AppText>
                  </View>
                </View>
                <View
                  style={[
                    styles.metricDivider,
                    { backgroundColor: theme.colors.border },
                  ]}
                />
                <View testID="walk-time-group" style={styles.metricGroup}>
                  <View style={styles.metric}>
                    <AppText
                      preset="caption"
                      testID="walk-time-label"
                      style={[
                        WALK_TEXT.caption,
                        {
                          color: theme.colors.textSecondary,
                          textAlign: 'center',
                        },
                      ]}
                    >
                      산책 시간
                    </AppText>
                    <WalkElapsedMetric
                      activeMs={activeMs}
                      sessionKey={props.clockSessionKey}
                      running={
                        !!props.clockRunning &&
                        !preview &&
                        !props.designReview &&
                        [
                          'WALKING',
                          'GPS_ACQUIRING',
                          'GPS_WEAK',
                          'GPS_LOST',
                        ].includes(state)
                      }
                      style={[
                        WALK_TEXT.metric,
                        styles.metricValue,
                        { color: copyAccent },
                      ]}
                    />
                  </View>
                </View>
              </View>
            )}
            {props.error && (
              <AppText preset="bodySm" accessibilityLiveRegion="polite">
                지금 요청을 완료하지 못했어요. 산책 상태를 확인한 뒤 다시 시도해
                주세요.
              </AppText>
            )}
          </ScrollView>
          <View
            testID="walk-controls"
            style={[
              styles.controls,
              styles.controlsInset,
              stacked && styles.stack,
              { paddingBottom: props.insetBottom + 12 },
            ]}
          >
            <View style={[styles.flex, stacked && styles.stackedCell]}>
              <WalkAction
                label={primary}
                season={season}
                role="primary"
                outlined
                filled
                readOnly={props.designReview}
                disabled={busy}
                onPress={props.onPrimary}
                testID="walk-primary"
              />
            </View>
            {!pre && !result && (
              <View style={[styles.flex, stacked && styles.stackedCell]}>
                <WalkAction
                  label={recovery ? '여기서 산책 마치기' : '산책 종료'}
                  season={season}
                  outlined
                  filled
                  readOnly={props.designReview}
                  role="destructiveConfirm"
                  onPress={props.onFinish}
                  disabled={busy}
                  testID="walk-finish"
                />
              </View>
            )}
          </View>
        </Bottom>
      )}
      {confirm && (
        <WalkFinishSheet
          visible
          season={season}
          insetTop={props.insetTop}
          insetBottom={props.insetBottom}
          distanceM={distanceM}
          activeMs={activeMs}
          sessionKey={props.clockSessionKey}
          running={!!props.clockRunning && !preview && !props.designReview}
          busy={busy}
          error={props.error}
          onDismiss={props.onCancelFinish}
          onFinish={props.onFinish}
        />
      )}
    </Root>
  );
}
const styles = StyleSheet.create({
  flex: { flex: 1, minWidth: 0 },
  stackedCell: { flex: 0, alignSelf: 'stretch' },
  actionText: { flexShrink: 1, minWidth: 0 },
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
  controlTarget: {
    minHeight: 84,
    paddingVertical: 0,
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  controlFace: {
    minHeight: 48,
    width: '100%',
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 6,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  controlIcon: {
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filledControlIcon: { borderRadius: 14 },
  controlGlyph: {
    textAlign: 'center',
    textAlignVertical: 'center',
    includeFontPadding: false,
  },
  playGlyph: { transform: [{ translateX: 1 }] },
  controlLabel: { flexShrink: 1, textAlign: 'center' },
  mapStage: { flex: 1, minHeight: 180 },
  recoveryMap: { minHeight: 0 },
  containedArt: { width: '100%', height: '100%' },
  acquiringContent: {
    flexGrow: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingVertical: 12,
    gap: 8,
    backgroundColor: lightColors.surfaceElevated,
  },
  acquiringArt: { width: '100%', maxWidth: 320, aspectRatio: 1.5 },
  stateTitle: { fontSize: 16, lineHeight: 24, textAlign: 'center' },
  recoveryContent: { alignItems: 'center', gap: 8 },
  recoveryArt: { width: '100%', maxWidth: 320, aspectRatio: 2 },
  recoveryCopy: { fontSize: 13, lineHeight: 21, textAlign: 'center' },
  mapTop: { position: 'absolute', top: 12, left: 16, right: 16, zIndex: 2 },
  dim: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(11,18,32,0.18)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  recenter: {
    position: 'absolute',
    bottom: WALK_SHEET_OVERLAP + 16,
    right: 16,
    gap: 6,
    alignItems: 'flex-end',
  },
  stateLine: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  contextWeather: { flexShrink: 1, maxWidth: '46%' },
  sheetScroll: { flexGrow: 0, flexShrink: 1 },
  bottomContent: { paddingTop: 20, paddingHorizontal: 16, gap: 14 },
  metrics: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 6,
  },
  metricGroup: {
    flex: 1,
    minWidth: 0,
    alignItems: 'center',
  },
  metricDivider: { width: 1, alignSelf: 'stretch', marginVertical: 4 },
  metric: { minWidth: 0, gap: 4, alignItems: 'center', width: '100%' },
  metricValue: { textAlign: 'center', width: '100%' },
  controls: { flexDirection: 'row', gap: 12 },
  controlsInset: { paddingHorizontal: 16, paddingTop: 8 },
  stack: { flexDirection: 'column' },
});
