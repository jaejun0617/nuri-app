/* 파일: src/types/global.d.ts */
declare global {
  // 최소한의 글로벌 보강
  // (이미 index.js에서 global.Buffer를 주입하므로 타입만 알려줌)

  var Buffer: typeof import('buffer').Buffer;
}

export {};
