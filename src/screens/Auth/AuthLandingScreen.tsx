// 파일: src/screens/Auth/AuthLandingScreen.tsx
// 목적:
// - 게스트 유도 랜딩
// - "로그인 / 회원가입 / 게스트로 계속" 진입점

import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import type { RootStackParamList } from '../../navigation/RootNavigator';

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
          style={styles.primary}
          onPress={() => navigation.navigate('SignIn')}
        >
          <Text style={styles.primaryText}>로그인</Text>
        </TouchableOpacity>

        <TouchableOpacity
          activeOpacity={0.9}
          style={styles.secondary}
          onPress={() => navigation.navigate('SignUp')}
        >
          <Text style={styles.secondaryText}>회원가입</Text>
        </TouchableOpacity>

        <TouchableOpacity
          activeOpacity={0.8}
          style={styles.ghost}
          onPress={() => navigation.replace('Main')}
        >
          <Text style={styles.ghostText}>게스트로 계속</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#F6F2EE',
    justifyContent: 'center',
    padding: 18,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    padding: 18,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 },
    elevation: 3,
  },
  title: { fontSize: 24, fontWeight: '900', color: '#1D1B19', marginBottom: 6 },
  subTitle: {
    fontSize: 13,
    color: '#6E6660',
    fontWeight: '600',
    lineHeight: 18,
  },
  spacer: { height: 18 },

  primary: {
    height: 48,
    borderRadius: 14,
    backgroundColor: '#97A48D',
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryText: { color: '#FFFFFF', fontSize: 15, fontWeight: '900' },

  secondary: {
    marginTop: 10,
    height: 48,
    borderRadius: 14,
    backgroundColor: '#EFEAE4',
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryText: { color: '#1D1B19', fontSize: 15, fontWeight: '900' },

  ghost: { marginTop: 12, alignItems: 'center', paddingVertical: 10 },
  ghostText: { color: '#7A726C', fontSize: 13, fontWeight: '700' },
});
