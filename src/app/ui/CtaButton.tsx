import React, { createContext, useContext } from 'react';
import { Pressable, StyleSheet, View, type PressableProps } from 'react-native';
import { useTheme } from 'styled-components/native';
import { useEffectiveSeason } from '../providers/SeasonPreferenceProvider';
import {
  resolveCtaPalette,
  type CtaPalette,
  type CtaRole,
  type CtaVariant,
} from '../theme/ctaPalette';
import AppText from './AppText';
import NuriFeatherIcon from '../../components/icons/NuriFeatherIcon';
import LavenderCtaFill from './LavenderCtaFill';
import { MenuGlassSurface } from '../../components/common/MenuGlassSurface';

const CtaContext = createContext<CtaPalette | null>(null);
type Props = Omit<PressableProps, 'children' | 'style' | 'role'> & {
  role: CtaRole;
  variant?: CtaVariant;
  loading?: boolean;
  compact?: boolean;
  solidFaceInset?: number;
  visuallyHidden?: boolean;
  activeOpacity?: number;
  style?: PressableProps['style'];
  children?: React.ReactNode | ((palette: CtaPalette) => React.ReactNode);
};

/** Explicit opt-in prevents shared Auth, Weather and onboarding callers changing. */
export default function CtaButton({
  role,
  variant = 'default',
  loading = false,
  compact = false,
  solidFaceInset,
  visuallyHidden = false,
  activeOpacity: _activeOpacity,
  disabled = false,
  accessibilityState,
  style,
  children,
  onPress,
  ...rest
}: Props) {
  const theme = useTheme();
  const season = useEffectiveSeason();
  const blocked = disabled || loading || role === 'disabled';
  const faceInset = variant === 'solidLavender' ? solidFaceInset : undefined;
  const borderless = variant === 'opaqueGlass' && role === 'neutral';
  return (
    <Pressable
      {...rest}
      accessibilityRole="button"
      accessibilityState={{
        ...accessibilityState,
        disabled: blocked,
        busy: loading,
      }}
      disabled={blocked}
      onPress={onPress}
      style={({ pressed }) => {
        const palette = resolveCtaPalette({
          role,
          variant,
          season,
          colorScheme: theme.mode,
          colors: theme.colors,
          state: loading
            ? 'loading'
            : blocked
            ? 'disabled'
            : pressed
            ? 'pressed'
            : 'default',
        });
        const callerStyle =
          typeof style === 'function' ? style({ pressed }) : style;
        const layout = StyleSheet.flatten(callerStyle);
        return [
          styles.button,
          compact && { paddingHorizontal: 8, paddingVertical: 8 },
          callerStyle,
          {
            height: undefined,
            minHeight: Math.max(
              compact ? 44 : 48,
              typeof layout?.height === 'number' ? layout.height : 0,
              typeof layout?.minHeight === 'number' ? layout.minHeight : 0,
            ),
            opacity: visuallyHidden ? 0 : 1,
            backgroundColor: faceInset === undefined ? palette.background : 'transparent',
            borderColor: faceInset === undefined ? palette.border : 'transparent',
            borderWidth: faceInset === undefined && !borderless ? 1 : 0,
          },
        ];
      }}
    >
      {({ pressed }) => {
        const palette = resolveCtaPalette({
          role,
          variant,
          season,
          colorScheme: theme.mode,
          colors: theme.colors,
          state: loading
            ? 'loading'
            : blocked
            ? 'disabled'
            : pressed
            ? 'pressed'
            : 'default',
        });
        const callerRadius = StyleSheet.flatten(
          typeof style === 'function' ? style({ pressed }) : style,
        )?.borderRadius ?? 8;
        // The fill sits inside the 1dp frame; matching outer radii creates corner seams.
        const fillRadius = typeof callerRadius === 'number'
          ? Math.max(0, callerRadius - 1)
          : callerRadius;
        return (
          <CtaContext.Provider value={palette}>
            {borderless && !blocked && theme.mode !== 'dark' ? (
              <View pointerEvents="none" accessible={false} style={[
                StyleSheet.absoluteFill,
                { opacity: pressed ? 0.4 : 1 },
              ]}>
                <MenuGlassSurface
                  testID={rest.testID ? `${rest.testID}-glass` : undefined}
                  radius={typeof callerRadius === 'number' ? callerRadius : styles.button.borderRadius}
                  borderless
                />
              </View>
            ) : null}
            {faceInset !== undefined ? (
              <View
                testID={rest.testID ? `${rest.testID}-face` : undefined}
                pointerEvents="none"
                accessible={false}
                style={[styles.insetFace, {
                  top: faceInset,
                  right: faceInset,
                  bottom: faceInset,
                  left: faceInset,
                  borderRadius: typeof callerRadius === 'number' ? Math.max(0, callerRadius - faceInset) : callerRadius,
                  backgroundColor: palette.background,
                  borderColor: palette.border,
                }]}
              />
            ) : null}
            {variant !== 'solidLavender' && (role === 'primary' || role === 'primarySubtle') && !(!loading && disabled) ? (
              <LavenderCtaFill pressed={pressed && !loading} radius={fillRadius} />
            ) : null}
            {typeof children === 'function' ? children(palette) : children}
          </CtaContext.Provider>
        );
      }}
    </Pressable>
  );
}

export function CtaText({
  style,
  ...props
}: React.ComponentProps<typeof AppText>) {
  const palette = useContext(CtaContext);
  if (!palette) throw new Error('CtaText requires CtaButton');
  return (
    <AppText
      {...props}
      color={palette.text}
      style={[{ flexShrink: 1 }, style, { color: palette.text }]}
    />
  );
}

export function CtaIcon(props: React.ComponentProps<typeof NuriFeatherIcon>) {
  const palette = useContext(CtaContext);
  if (!palette) throw new Error('CtaIcon requires CtaButton');
  return <NuriFeatherIcon {...props} color={palette.text} />;
}

const styles = StyleSheet.create({
  insetFace: {
    position: 'absolute',
    borderWidth: 1,
  },
  button: {
    minWidth: 0,
    minHeight: 48,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
