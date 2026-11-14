import React, { forwardRef, useMemo } from 'react';
import { StyleSheet, Text, TextInput, type TextProps, type TextInputProps } from 'react-native';
import { useResponsiveTypographyBand } from '../providers/ResponsiveTypographyProvider';
import { useTypographyScope } from '../providers/AppFontPreferenceProvider';
import { resolveResponsiveTextStyle } from '../typography/responsiveTypography';

// Legacy text surfaces keep their exact style, family and native ref.
export const ResponsiveNativeText = forwardRef<React.ComponentRef<typeof Text>, TextProps>(
  function ResponsiveNativeText({ style, ...props }, ref) {
    const band = useResponsiveTypographyBand();
    const fixed = useTypographyScope() === 'fixed' || props.allowFontScaling === false;
    const resolved = useMemo(() => resolveResponsiveTextStyle(StyleSheet.flatten(style), band, fixed), [band, fixed, style]);
    return <Text ref={ref} {...props} style={resolved} />;
  },
);
export const ResponsiveNativeTextInput = forwardRef<React.ComponentRef<typeof TextInput>, TextInputProps>(
  function ResponsiveNativeTextInput({ style, ...props }, ref) {
    const band = useResponsiveTypographyBand();
    const fixed = useTypographyScope() === 'fixed' || props.allowFontScaling === false;
    const resolved = useMemo(() => resolveResponsiveTextStyle(StyleSheet.flatten(style), band, fixed), [band, fixed, style]);
    return <TextInput ref={ref} {...props} style={resolved} />;
  },
);
