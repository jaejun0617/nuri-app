// 파일: src/assets/index.ts
// 목적:
// - Metro 번들러가 가장 확실하게 인식하는 "상대경로 require" 방식으로
//   앱 전역에서 사용하는 로컬 이미지를 한 곳에서 관리한다.
// - 추후 Supabase Storage URL(원격 이미지)로 전환하더라도,
//   UI 코드(MainScreen 등)는 최대한 덜 흔들리도록 한다.

export const ASSETS = {
  logo: require('./logo/logo.png'),
  sampleDogProfile: require('./logo/logo.png'),
} as const;
