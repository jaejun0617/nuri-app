// 파일: src/screens/Auth/AuthLandingScreen.tsx
// 목적:
// - 게스트 유도 랜딩
// - "로그인 / 회원가입 / 게스트로 계속" 진입점
// - ✅ RootStack에 Main 없음 → AppTabs로 이동

import React from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import type { RootStackParamList } from '../../navigation/RootNavigator';
import { styles } from './AuthLandingScreen.styles';

type Nav = NativeStackNavigationProp<RootStackParamList>;

export default function AuthLandingScreen() {
  const navigation = useNavigation<Nav>();

  return (
    <View style={styles.screen}>
      <View style={styles.card}>
        <Text style={styles.title}>NURI</Text>
        <Text style={styles.subTitle}>
          로그인하고 소중한 추억을{'\n'}기록해 보세요.
        </Text>

        <View style={styles.spacer} />

        <TouchableOpacity
          activeOpacity={0.9}
          style={styles.primaryButton}
          onPress={() => navigation.navigate('SignIn')}
        >
          <Text style={styles.primaryButtonText}>로그인</Text>
        </TouchableOpacity>

        <TouchableOpacity
          activeOpacity={0.9}
          style={styles.secondaryButton}
          onPress={() => navigation.navigate('SignUp')}
        >
          <Text style={styles.secondaryButtonText}>회원가입</Text>
        </TouchableOpacity>

        <TouchableOpacity
          activeOpacity={0.85}
          style={styles.ghostButton}
          onPress={() =>
            navigation.reset({
              index: 0,
              routes: [{ name: 'AppTabs' }],
            })
          }
        >
          <Text style={styles.ghostButtonText}>게스트로 계속</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}
