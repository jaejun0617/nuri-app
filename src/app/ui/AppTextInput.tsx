import React, { forwardRef, memo, useMemo } from 'react';
import type { TextInputProps, TextStyle } from 'react-native';
import { StyleSheet, TextInput } from 'react-native';
import { useTheme } from 'styled-components/native';

import {
  useAppFontPreference,
  useTypographyScope,
} from '../providers/AppFontPreferenceProvider';
import {
  resolveAppFontMode,
  type AppFontMode,
} from '../typography/appFontMode';

type Props = TextInputProps & {
  fontModeOverride?: AppFontMode;
};

/**
 * 비제외 입력 화면에서 최근 기록 기준의 입력 글꼴을 유지한다.
 * 색상, placeholder, 키보드, selection 등 화면별 동작은 호출부 스타일을 보존한다.
 */
const AppTextInput = memo(
  forwardRef<React.ComponentRef<typeof TextInput>, Props>(
    function AppTextInputComponent({ fontModeOverride, style, ...rest }, ref) {
      const theme = useTheme();
      const { mode } = useAppFontPreference();
      const typographyScope = useTypographyScope();
      const effectiveMode = resolveAppFontMode({
        mode,
        scope: typographyScope,
        override: fontModeOverride,
      });
      const composedStyle = useMemo(
        () =>
          StyleSheet.flatten([
            style,
            theme.typography.preset.unifiedLabel as TextStyle,
            effectiveMode
              ? (theme.typography.appFontMode[effectiveMode] as TextStyle)
              : null,
          ]),
        [effectiveMode, style, theme.typography],
      );

      return <TextInput ref={ref} {...rest} style={composedStyle} />;
    },
  ),
);

AppTextInput.displayName = 'AppTextInput';

export default AppTextInput;
