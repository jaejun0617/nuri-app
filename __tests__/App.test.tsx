/**
 * @format
 */
// 파일: __tests__/App.test.tsx
// 역할:
// - App 루트 컴포넌트가 기본 렌더 단계에서 크래시 없이 마운트되는지 확인
// - 네비게이션/프로바이더 조합 변경 시 가장 바깥 경계의 회귀를 빠르게 감지하는 스모크 테스트

import React from 'react';
import ReactTestRenderer from 'react-test-renderer';
import App from '../App';

test('renders correctly', async () => {
  await ReactTestRenderer.act(() => {
    ReactTestRenderer.create(<App />);
  });
});
