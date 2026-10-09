import React from 'react';
import CtaButton from '../../app/ui/CtaButton';
import BlurCaptureExclusion from '../../components/common/BlurCaptureExclusion';
import NuriSemanticIcon from '../../components/icons/NuriSemanticIcon';
import { styles } from './TimelineScreen.styles';

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
    <BlurCaptureExclusion
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
    </BlurCaptureExclusion>
  );
}
