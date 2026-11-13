import React, { createContext, useContext } from 'react';
import { Pressable, StyleSheet, type PressableProps } from 'react-native';
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

const CtaContext = createContext<CtaPalette | null>(null);
type Props = Omit<PressableProps, 'children' | 'style' | 'role'> & {
  role: CtaRole;
  variant?: CtaVariant;
  loading?: boolean;
  compact?: boolean;
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
            backgroundColor: palette.background,
            borderColor: palette.border,
            borderWidth: 1,
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
