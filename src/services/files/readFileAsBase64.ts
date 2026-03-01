// 파일: src/services/files/readFileAsBase64.ts
// 목적:
// - Android content:// / file:// URI를 base64로 읽어오기
// - react-native-blob-util 기반
//
// 주의:
// - New Architecture(Fabric) 켜져 있으면 RNBlobUtil이 null로 로딩 실패할 수 있음
//   => android/gradle.properties newArchEnabled=false 권장

import RNBlobUtil from 'react-native-blob-util';

export async function readFileAsBase64(inputUri: string): Promise<string> {
  if (!inputUri) throw new Error('파일 URI가 없습니다.');

  // RNBlobUtil이 null로 로딩되면 여기서 바로 잡아준다.
  if (!RNBlobUtil?.fs) {
    throw new Error(
      'RNBlobUtil이 로드되지 않았습니다. (newArchEnabled=false + 클린빌드 필요)',
    );
  }

  // 1) file:// 제거 (BlobUtil은 보통 raw path 선호)
  const uri = inputUri.startsWith('file://')
    ? inputUri.replace('file://', '')
    : inputUri;

  // 2) content:// 인 경우: stat()으로 실제 접근 가능한 path로 바꿔 읽기
  if (uri.startsWith('content://')) {
    const stat = await RNBlobUtil.fs.stat(uri);
    if (!stat?.path) {
      throw new Error('content URI를 파일 경로로 변환할 수 없습니다.');
    }
    return RNBlobUtil.fs.readFile(stat.path, 'base64');
  }

  // 3) 일반 파일 경로
  return RNBlobUtil.fs.readFile(uri, 'base64');
}
