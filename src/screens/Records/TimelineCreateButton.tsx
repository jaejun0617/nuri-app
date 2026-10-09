import React from 'react';
import {
  Platform,
  View,
  requireNativeComponent,
  type ViewProps,
} from 'react-native';
import CtaButton from '../../app/ui/CtaButton';
import NuriSemanticIcon from '../../components/icons/NuriSemanticIcon';
import { styles } from './TimelineScreen.styles';

const CaptureBoundary =
  Platform.OS === 'android'
    ? requireNativeComponent<ViewProps>('NuriBlurCaptureExclusion')
    : View;

/** The fixed button must not be captured as a backdrop by scrolling glass rows. */
export default function TimelineCreateButton({
  bottom,
  rightInset,
  onPress,
}: {
  bottom: number;
  rightInset: number;
  onPress: () => void;
}) {
  return (
    <CaptureBoundary
      testID="timeline-create-capture-boundary"
      collapsable={false}
      pointerEvents="box-none"
      style={[
        styles.floatingCreatePosition,
        {
          bottom,
          right: styles.floatingCreatePosition.right + rightInset,
        },
      ]}
    >
      <CtaButton
        testID="timeline-fixed-create"
        role="primary"
        accessibilityLabel="기록하기"
        style={styles.floatingCreateButton}
        onPress={onPress}
      >
        <NuriSemanticIcon
          family="feather"
          name="plus"
          size={24}
          color="#FFFFFF"
          preserveOriginal
        />
      </CtaButton>
    </CaptureBoundary>
  );
}
