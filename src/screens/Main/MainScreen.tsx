// 파일: src/screens/Main/MainScreen.tsx
// 목적:
// - 홈 진입점에서 Guest / Logged-in 레이아웃을 완전히 분리
// - MainScreen은 "분기"만 담당한다.

import React from 'react';
import { useAuthStore } from '../../store/authStore';

import GuestHome from './components/GuestHome/GuestHome';
import LoggedInHome from './components/LoggedInHome/LoggedInHome';

export default function MainScreen() {
  const isLoggedIn = useAuthStore(s => s.isLoggedIn);

  if (!isLoggedIn) return <GuestHome />;
  return <LoggedInHome />;
}
