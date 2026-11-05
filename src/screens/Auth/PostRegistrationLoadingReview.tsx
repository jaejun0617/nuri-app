import React, { useState } from 'react';
import { Modal } from 'react-native';
import CtaButton, { CtaText } from '../../app/ui/CtaButton';
import WelcomeTransitionScreen from './WelcomeTransitionScreen';

/** Design-only preview: no registration, session change or automatic navigation. */
export default function PostRegistrationLoadingReview({ petName }: { petName?: string }) {
  const [visible, setVisible] = useState(false);
  if (!__DEV__) return null;
  return <>
    <CtaButton role="neutral" testID="post-registration-loading-review" onPress={() => setVisible(true)}>
      <CtaText preset="unifiedLabel">등록 후 로딩 미리보기</CtaText>
    </CtaButton>
    {visible ? <Modal visible animationType="none" statusBarTranslucent navigationBarTranslucent onRequestClose={() => setVisible(false)}>
      <WelcomeTransitionScreen holdForDesignReview petName={petName} />
    </Modal> : null}
  </>;
}
