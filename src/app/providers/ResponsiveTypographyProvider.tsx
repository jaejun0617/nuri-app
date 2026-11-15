import React, { createContext, useContext, useMemo } from 'react';
import { Platform, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { getResponsiveContentWidth } from '../../services/app/responsiveLayout';
import { DEFAULT_TYPOGRAPHY_BAND, resolveCompactReadingScale, responsiveTypographyBand } from '../typography/responsiveTypography';

const ResponsiveTypography = createContext({ widthBand: DEFAULT_TYPOGRAPHY_BAND, readingScale: 1 });
export const useResponsiveTypography = () => useContext(ResponsiveTypography);

export function ResponsiveTypographyProvider({ children }: React.PropsWithChildren) {
  const { width, fontScale } = useWindowDimensions();
  const { left, right } = useSafeAreaInsets();
  const widthBand = responsiveTypographyBand(getResponsiveContentWidth(width, left, right));
  // The pilot uses the Android window width before subtracting insets.
  const readingScale = Platform.OS === 'android' ? resolveCompactReadingScale(width, fontScale) : 1;
  const value = useMemo(() => ({ widthBand, readingScale }), [widthBand, readingScale]);
  return <ResponsiveTypography.Provider value={value}>{children}</ResponsiveTypography.Provider>;
}
