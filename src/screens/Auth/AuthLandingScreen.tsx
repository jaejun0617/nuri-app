// 파일: src/screens/Auth/AuthLandingScreen.tsx
// 목적:
// - 게스트가 로그인/회원가입으로 진입하는 관문 화면
// - "게스트로 계속하기"도 제공(guest 우선 전략 유지)

import React from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import { styles } from './AuthLandingScreen.styles';
import type { RootStackParamList } from '../../navigation/RootNavigator';

type Props = NativeStackScreenProps<RootStackParamList, 'AuthLanding'>;

export default function AuthLandingScreen({ navigation }: Props) {
  const goSignIn = () => navigation.navigate('SignIn');
  const goSignUp = () => navigation.navigate('SignUp');

  const continueAsGuest = () => {
    // 정책: Auth를 빠져나가 Main으로 복귀
    navigation.reset({ index: 0, routes: [{ name: 'Main' }] });
  };

  return (
    <View style={styles.screen}>
      <View style={styles.card}>
        <Text style={styles.title}>NURI에 오신 걸 환영해요</Text>
        <Text style={styles.subTitle}>
          로그인하면 닉네임 인사말과 아이의 추억을 안전하게 저장할 수 있어요.
        </Text>

        <TouchableOpacity
          activeOpacity={0.9}
          style={styles.primaryButton}
          onPress={goSignIn}
        >
          <Text style={styles.primaryButtonText}>로그인</Text>
        </TouchableOpacity>

        <TouchableOpacity
          activeOpacity={0.9}
          style={styles.secondaryButton}
          onPress={goSignUp}
        >
          <Text style={styles.secondaryButtonText}>회원가입</Text>
        </TouchableOpacity>

        <TouchableOpacity
          activeOpacity={0.8}
          style={styles.ghostButton}
          onPress={continueAsGuest}
        >
          <Text style={styles.ghostButtonText}>게스트로 계속하기</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}
