import React, { createContext, useContext } from 'react';
import { useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { getResponsiveContentWidth } from '../../services/app/responsiveLayout';
import { DEFAULT_TYPOGRAPHY_BAND, responsiveTypographyBand } from '../typography/responsiveTypography';

const ResponsiveTypography = createContext(DEFAULT_TYPOGRAPHY_BAND);
export const useResponsiveTypographyBand = () => useContext(ResponsiveTypography);

export function ResponsiveTypographyPreview({ width, children }: React.PropsWithChildren<{ width: number }>) {
  return <ResponsiveTypography.Provider value={responsiveTypographyBand(width)}>{children}</ResponsiveTypography.Provider>;
}

export function ResponsiveTypographyProvider({ children }: React.PropsWithChildren) {
  const { width } = useWindowDimensions();
  const { left, right } = useSafeAreaInsets();
  return (
    <ResponsiveTypographyPreview width={getResponsiveContentWidth(width, left, right)}>
      {children}
    </ResponsiveTypographyPreview>
  );
}
