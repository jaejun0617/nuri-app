import React, { forwardRef, useMemo } from 'react';
import { StyleSheet, Text, TextInput, type TextProps, type TextInputProps } from 'react-native';
import { useResponsiveTypography } from '../providers/ResponsiveTypographyProvider';
import { useTypographyScope } from '../providers/AppFontPreferenceProvider';
import { resolveResponsiveTextStyle } from '../typography/responsiveTypography';

// Legacy text surfaces keep their exact style, family and native ref.
export const ResponsiveNativeText = forwardRef<React.ComponentRef<typeof Text>, TextProps>(
  function ResponsiveNativeText({ style, ...props }, ref) {
    const { widthBand, readingScale } = useResponsiveTypography();
    const fixedWidth = useTypographyScope() === 'fixed';
    const { allowFontScaling } = props;
    const resolved = useMemo(() => resolveResponsiveTextStyle(StyleSheet.flatten(style), widthBand, {
      fixedWidth, allowFontScaling, readingScale,
    }), [widthBand, fixedWidth, style, allowFontScaling, readingScale]);
    return <Text ref={ref} {...props} allowFontScaling={false} style={resolved} />;
  },
);
export const ResponsiveNativeTextInput = forwardRef<React.ComponentRef<typeof TextInput>, TextInputProps>(
  function ResponsiveNativeTextInput({ style, ...props }, ref) {
    const { widthBand, readingScale } = useResponsiveTypography();
    const fixedWidth = useTypographyScope() === 'fixed';
    const { allowFontScaling } = props;
    const resolved = useMemo(() => resolveResponsiveTextStyle(StyleSheet.flatten(style), widthBand, {
      fixedWidth, allowFontScaling, readingScale,
    }), [widthBand, fixedWidth, style, allowFontScaling, readingScale]);
    return <TextInput ref={ref} {...props} allowFontScaling={false} style={resolved} />;
  },
);
