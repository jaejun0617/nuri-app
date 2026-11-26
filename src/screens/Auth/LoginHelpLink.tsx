import React, { useState } from 'react';
import { TouchableOpacity, View } from 'react-native';
import AppText from '../../app/ui/AppText';
import PremiumNoticeModal from '../../components/common/PremiumNoticeModal';
import { SUPPORT_EMAIL } from '../../config/supportContact';
import { styles } from './SignInScreen.styles';

export default function LoginHelpLink() {
  const [visible, setVisible] = useState(false);
  const close = () => setVisible(false);
  return (
    <View style={styles.legal}>
      <TouchableOpacity
        testID="sign-in-help"
        accessibilityRole="link"
        accessibilityLabel="로그인이 안 되나요?"
        onPress={() => setVisible(true)}
        style={styles.legalLink}
      >
        <AppText preset="caption" styleOverridesPreset style={styles.legalLinkText}>로그인이 안 되나요?</AppText>
      </TouchableOpacity>
      {visible ? (
        <PremiumNoticeModal
          visible
          typographyMode="unified"
          eyebrow="로그인 도움말"
          iconName="shield"
          titleLines={['로그인이 안 되나요?']}
          bodyLines={[
            '로그인을 마쳐도 누리로 돌아오지 않거나 계속 로그인할 수 없다면 아래 주소로 문의해 주세요.',
            SUPPORT_EMAIL,
            '일반 문의는 로그인 후 고객센터의 1:1 문의를 이용해 주세요.',
          ]}
          confirmLabel="닫기"
          onConfirm={close}
          onClose={close}
        />
      ) : null}
    </View>
  );
}
