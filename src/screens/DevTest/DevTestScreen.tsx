// 파일: src/screens/DevTest/DevTestScreen.tsx
// -------------------------------------------------------------
// 역할:
// - Supabase "가장 빠른 end-to-end" 검증 화면
// -------------------------------------------------------------

import React, { useCallback, useMemo, useState } from 'react';
import { Alert, PermissionsAndroid, Platform } from 'react-native';
import { launchImageLibrary } from 'react-native-image-picker';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Buffer } from 'buffer';
import AppText from '../../app/ui/AppText';
import type { RootStackParamList } from '../../navigation/RootNavigator';
import { supabase } from '../../services/supabase/client';
import * as S from './DevTestScreen.styles';

type Nav = NativeStackNavigationProp<RootStackParamList, 'DevTest'>;

type PetRow = {
  id: string;
  user_id: string;
  name: string;
  profile_image_url: string | null;
  created_at: string;
};

type PickedImage = {
  name: string;
  type: string;
  base64: string;
};

export default function DevTestScreen() {
  const navigation = useNavigation<Nav>();

  // ---------------------------------------------------------
  // 0) 입력 상태
  // ---------------------------------------------------------
  const [email, setEmail] = useState('test@nuri.dev');
  const [password, setPassword] = useState('password1234');
  const [nickname, setNickname] = useState('누리야사랑해');
  const [petName, setPetName] = useState('누리');

  // ---------------------------------------------------------
  // 1) 로그 유틸
  // ---------------------------------------------------------
  const [logs, setLogs] = useState<string[]>([]);
  const pushLog = useCallback((line: string) => {
    const ts = new Date().toLocaleTimeString();
    setLogs(prev => [`[${ts}] ${line}`, ...prev]);
  }, []);
  const clearLogs = () => setLogs([]);

  // ---------------------------------------------------------
  // 2) Auth helper
  // ---------------------------------------------------------
  const getAuthedUser = useCallback(async () => {
    const { data, error } = await supabase.auth.getUser();
    if (error) throw error;
    return data.user;
  }, []);

  const requireUser = useCallback(async () => {
    const user = await getAuthedUser();
    if (!user) throw new Error('로그인 세션이 없습니다. 먼저 로그인하세요.');
    return user;
  }, [getAuthedUser]);

  // ---------------------------------------------------------
  // 3) Auth 액션
  // ---------------------------------------------------------
  const onSignUp = useCallback(async () => {
    try {
      pushLog('회원가입 시도...');
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { nickname } },
      });
      if (error) throw error;

      pushLog(`회원가입 결과: user=${data.user?.id ?? 'null'}`);
      pushLog('※ 이메일 인증 ON이면 인증 후 로그인 가능');
      Alert.alert('OK', '회원가입 요청 완료. 로그 확인');
    } catch (e: any) {
      pushLog(`❌ 회원가입 실패: ${e?.message ?? String(e)}`);
      Alert.alert('에러', e?.message ?? '회원가입 실패');
    }
  }, [email, password, nickname, pushLog]);

  const onSignIn = useCallback(async () => {
    try {
      pushLog('로그인 시도...');
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (error) throw error;

      pushLog(`✅ 로그인 성공: user=${data.user?.id}`);
      Alert.alert('OK', '로그인 성공');
    } catch (e: any) {
      pushLog(`❌ 로그인 실패: ${e?.message ?? String(e)}`);
      Alert.alert('에러', e?.message ?? '로그인 실패');
    }
  }, [email, password, pushLog]);

  const onSignOut = useCallback(async () => {
    try {
      pushLog('로그아웃...');
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      pushLog('✅ 로그아웃 완료');
      Alert.alert('OK', '로그아웃 완료');
    } catch (e: any) {
      pushLog(`❌ 로그아웃 실패: ${e?.message ?? String(e)}`);
      Alert.alert('에러', e?.message ?? '로그아웃 실패');
    }
  }, [pushLog]);

  // ---------------------------------------------------------
  // 4) DB 테스트
  // ---------------------------------------------------------
  const onFetchProfile = useCallback(async () => {
    try {
      const user = await requireUser();
      pushLog(`profiles 조회: user=${user.id}`);

      const { data, error } = await supabase
        .from('profiles')
        .select('user_id,email,nickname,avatar_url,created_at')
        .eq('user_id', user.id)
        .single();

      if (error) throw error;

      pushLog(
        `✅ profiles: nickname=${data.nickname} email=${data.email ?? ''}`,
      );
      Alert.alert('OK', `반가워요! ${data.nickname}님`);
    } catch (e: any) {
      pushLog(`❌ profiles 조회 실패: ${e?.message ?? String(e)}`);
      Alert.alert('에러', e?.message ?? 'profiles 조회 실패');
    }
  }, [pushLog, requireUser]);

  const onInsertPet = useCallback(async () => {
    try {
      const user = await requireUser();
      pushLog(`pets insert: name=${petName}`);

      const { data, error } = await supabase
        .from('pets')
        .insert({ user_id: user.id, name: petName })
        .select('id,user_id,name,profile_image_url,created_at')
        .single();

      if (error) throw error;

      pushLog(`✅ pets insert OK: petId=${data.id}`);
      Alert.alert('OK', `펫 생성 완료: ${data.name}`);
    } catch (e: any) {
      pushLog(`❌ pets insert 실패: ${e?.message ?? String(e)}`);
      Alert.alert('에러', e?.message ?? 'pets insert 실패');
    }
  }, [petName, pushLog, requireUser]);

  const onFetchPets = useCallback(async () => {
    try {
      const user = await requireUser();
      pushLog('pets select (본인 것만 보여야 정상)');

      const { data, error } = await supabase
        .from('pets')
        .select('id,user_id,name,profile_image_url,created_at')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      pushLog(`✅ pets count=${data.length}`);
      if (data[0]) pushLog(`최근 펫: ${data[0].name} (${data[0].id})`);
      Alert.alert('OK', `pets=${data.length}개`);
    } catch (e: any) {
      pushLog(`❌ pets select 실패: ${e?.message ?? String(e)}`);
      Alert.alert('에러', e?.message ?? 'pets select 실패');
    }
  }, [pushLog, requireUser]);

  // ---------------------------------------------------------
  // 5) Storage 테스트 (base64 업로드)
  // ---------------------------------------------------------
  const BUCKET_PET = 'pet-profiles';

  const requestAndroidMediaPermission = useCallback(async () => {
    if (Platform.OS !== 'android') return true;

    // Android 13+ 권한이 READ_MEDIA_IMAGES로 바뀌었지만,
    // RN PermissionsAndroid는 버전에 따라 문자열 상수가 없을 수 있어 직접 문자열로 요청
    const perm =
      Platform.Version >= 33
        ? 'android.permission.READ_MEDIA_IMAGES'
        : PermissionsAndroid.PERMISSIONS.READ_EXTERNAL_STORAGE;

    const granted = await PermissionsAndroid.request(perm);
    return granted === PermissionsAndroid.RESULTS.GRANTED;
  }, []);

  const pickImageBase64 = useCallback(async (): Promise<PickedImage | null> => {
    const ok = await requestAndroidMediaPermission();
    if (!ok) {
      Alert.alert(
        '권한 필요',
        '사진 접근 권한을 허용해야 업로드 테스트가 가능합니다.',
      );
      return null;
    }

    const res = await launchImageLibrary({
      mediaType: 'photo',
      selectionLimit: 1,
      includeBase64: true, // ✅ 핵심: RN에서 blob 변환 없이 안정적으로 업로드
      quality: 0.9,
    });

    if (res.didCancel) return null;
    const asset = res.assets?.[0];
    if (!asset?.base64) return null;

    const fileName =
      asset.fileName ??
      `image_${Date.now()}.${asset.type?.split('/')?.[1] ?? 'jpg'}`;

    return {
      name: fileName,
      type: asset.type ?? 'image/jpeg',
      base64: asset.base64,
    };
  }, [requestAndroidMediaPermission]);

  const base64ToArrayBuffer = useCallback((base64: string) => {
    const buf = Buffer.from(base64, 'base64');
    // Uint8Array로 감싸서 ArrayBuffer 확보
    const bytes = new Uint8Array(buf);
    return bytes.buffer;
  }, []);

  const onUploadPetProfile = useCallback(async () => {
    try {
      const user = await requireUser();

      // 1) 최근 펫 1마리 가져오기
      const { data: pets, error: petsErr } = await supabase
        .from('pets')
        .select('id,user_id,name,profile_image_url,created_at')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(1);

      if (petsErr) throw petsErr;

      const pet = pets?.[0] as PetRow | undefined;
      if (!pet)
        throw new Error('연결할 펫이 없습니다. 먼저 펫을 1마리 생성하세요.');

      // 2) 이미지 선택
      pushLog('이미지 선택...');
      const picked = await pickImageBase64();
      if (!picked) {
        pushLog('이미지 선택 취소/실패');
        return;
      }

      // 3) 업로드
      const path = `${user.id}/${pet.id}/${Date.now()}_${picked.name}`;
      pushLog(`업로드 시작: bucket=${BUCKET_PET} path=${path}`);

      const arrayBuffer = base64ToArrayBuffer(picked.base64);

      const { error: upErr } = await supabase.storage
        .from(BUCKET_PET)
        .upload(path, arrayBuffer, {
          contentType: picked.type,
          upsert: true,
        });

      if (upErr) throw upErr;
      pushLog('✅ 업로드 성공');

      // 4) DB path 저장
      const { error: updErr } = await supabase
        .from('pets')
        .update({ profile_image_url: path })
        .eq('id', pet.id);

      if (updErr) throw updErr;
      pushLog(`✅ pets.profile_image_url 업데이트 OK (petId=${pet.id})`);

      // 5) Signed URL 생성
      const { data: signed, error: signErr } = await supabase.storage
        .from(BUCKET_PET)
        .createSignedUrl(path, 60 * 60);

      if (signErr) throw signErr;

      pushLog('✅ Signed URL 생성 OK');
      pushLog(`signedUrl=${signed.signedUrl}`);

      Alert.alert(
        'OK',
        `업로드 완료!\npet=${pet.name}\n(로그에서 Signed URL 확인)`,
      );
    } catch (e: any) {
      pushLog(`❌ 업로드 실패: ${e?.message ?? String(e)}`);
      Alert.alert('에러', e?.message ?? '업로드 실패');
    }
  }, [base64ToArrayBuffer, pickImageBase64, pushLog, requireUser]);

  // ---------------------------------------------------------
  // 6) 화면
  // ---------------------------------------------------------
  const logText = useMemo(() => logs.join('\n'), [logs]);

  return (
    <S.Screen>
      <S.TitleRow>
        <AppText preset="title2" color="#ffffff">
          DevTest (Supabase)
        </AppText>

        <S.BtnGhost onPress={() => navigation.navigate('Main')}>
          <AppText preset="caption" color="#ffffff" weight="700">
            Main으로
          </AppText>
        </S.BtnGhost>
      </S.TitleRow>

      <S.Box>
        <AppText preset="headline" color="#ffffff">
          1) Auth
        </AppText>

        <S.Label>
          <AppText preset="caption" color="rgba(255,255,255,0.7)">
            Email
          </AppText>
        </S.Label>
        <S.Input
          value={email}
          onChangeText={setEmail}
          placeholder="email"
          autoCapitalize="none"
        />

        <S.Label>
          <AppText preset="caption" color="rgba(255,255,255,0.7)">
            Password
          </AppText>
        </S.Label>
        <S.Input
          value={password}
          onChangeText={setPassword}
          placeholder="password"
          secureTextEntry
        />

        <S.Label>
          <AppText preset="caption" color="rgba(255,255,255,0.7)">
            Nickname (signup meta)
          </AppText>
        </S.Label>
        <S.Input
          value={nickname}
          onChangeText={setNickname}
          placeholder="누리야사랑해"
        />

        <S.Row>
          <S.Btn onPress={onSignUp}>
            <AppText preset="body" color="#fff" weight="700">
              회원가입
            </AppText>
          </S.Btn>
          <S.Btn onPress={onSignIn}>
            <AppText preset="body" color="#fff" weight="700">
              로그인
            </AppText>
          </S.Btn>
          <S.BtnGhost onPress={onSignOut}>
            <AppText preset="body" color="#fff" weight="700">
              로그아웃
            </AppText>
          </S.BtnGhost>
          <S.BtnGhost onPress={onFetchProfile}>
            <AppText preset="body" color="#fff" weight="700">
              프로필 조회
            </AppText>
          </S.BtnGhost>
        </S.Row>
      </S.Box>

      <S.Box>
        <AppText preset="headline" color="#ffffff">
          2) DB / RLS (pets)
        </AppText>

        <S.Label>
          <AppText preset="caption" color="rgba(255,255,255,0.7)">
            Pet Name
          </AppText>
        </S.Label>
        <S.Input value={petName} onChangeText={setPetName} placeholder="누리" />

        <S.Row>
          <S.Btn onPress={onInsertPet}>
            <AppText preset="body" color="#fff" weight="700">
              펫 생성
            </AppText>
          </S.Btn>
          <S.BtnGhost onPress={onFetchPets}>
            <AppText preset="body" color="#fff" weight="700">
              펫 조회
            </AppText>
          </S.BtnGhost>
        </S.Row>
      </S.Box>

      <S.Box>
        <AppText preset="headline" color="#ffffff">
          3) Storage (pet-profiles)
        </AppText>

        <S.Row>
          <S.Btn onPress={onUploadPetProfile}>
            <AppText preset="body" color="#fff" weight="700">
              프로필 이미지 업로드
            </AppText>
          </S.Btn>
        </S.Row>

        <AppText
          preset="caption"
          color="rgba(255,255,255,0.7)"
          style={{ marginTop: 10 }}
        >
          - base64로 업로드 (RN blob 변환 이슈 회피){'\n'}- 성공 후
          pets.profile_image_url에 path 저장{'\n'}- Signed URL은 1시간 생성(로그
          확인)
        </AppText>
      </S.Box>

      <S.Box>
        <S.Row>
          <S.BtnGhost onPress={clearLogs}>
            <AppText preset="body" color="#fff" weight="700">
              로그 지우기
            </AppText>
          </S.BtnGhost>
        </S.Row>

        <S.LogWrap>
          <AppText preset="caption" color="#ffffff">
            {logText || '(로그 없음)'}
          </AppText>
        </S.LogWrap>
      </S.Box>
    </S.Screen>
  );
}
