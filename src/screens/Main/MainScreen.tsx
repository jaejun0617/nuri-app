// 파일: src/screens/Main/MainScreen.tsx
// 목적:
// - 홈 진입점
// - Guest / Logged-in 레이아웃 완전 분리
// - 이 컴포넌트는 "분기만" 담당

import React from 'react';
import { useAuthStore } from '../../store/authStore';

import GuestHome from './components/GuestHome/GuestHome';
import LoggedInHome from './components/LoggedInHome/LoggedInHome';

export default function MainScreen() {
  const isLoggedIn = useAuthStore(s => s.isLoggedIn);

  if (!isLoggedIn) return <GuestHome />;
  return <LoggedInHome />;
}
