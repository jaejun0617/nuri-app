import React, { createContext, useContext } from 'react';
import { useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { getResponsiveContentWidth } from '../../services/app/responsiveLayout';
import { responsiveTypographyBand } from '../typography/responsiveTypography';

const ResponsiveBand = createContext(3);
export const useResponsiveTypographyBand = () => useContext(ResponsiveBand);

export function ResponsiveTypographyPreview({ width, fontScale, children }: React.PropsWithChildren<{ width: number; fontScale: number }>) {
  return <ResponsiveBand.Provider value={responsiveTypographyBand(width, fontScale)}>{children}</ResponsiveBand.Provider>;
}

export function ResponsiveTypographyProvider({ children }: React.PropsWithChildren) {
  const { width, fontScale } = useWindowDimensions();
  const { left, right } = useSafeAreaInsets();
  const band = responsiveTypographyBand(getResponsiveContentWidth(width, left, right), fontScale);
  return <ResponsiveBand.Provider value={band}>{children}</ResponsiveBand.Provider>;
}
