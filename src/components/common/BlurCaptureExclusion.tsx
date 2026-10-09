import React from 'react';
import {
  Platform,
  requireNativeComponent,
  View,
  type ViewProps,
} from 'react-native';

const Boundary =
  Platform.OS === 'android'
    ? requireNativeComponent<ViewProps>('NuriBlurCaptureExclusion')
    : View;

/** Excludes foreground from backdrop sampling while preserving normal rendering and touch. */
export default function BlurCaptureExclusion(props: ViewProps) {
  return <Boundary {...props} collapsable={false} />;
}
