// 파일: src/screens/Main/MainScreen.tsx
// 목적:
// - "홈" 진입점에서 Guest / Logged-in 레이아웃을 완전히 분리하여 렌더링
// - Guest 상태: GuestHome(왼쪽 UI)
// - Logged-in 상태: LoggedInHome(오른쪽 UI)
//
// 핵심 원칙:
// - MainScreen은 "분기"만 담당한다.
// - 레이아웃(구조)은 GuestHome / LoggedInHome에서 각각 독립적으로 관리한다.

import React from 'react';
import { useAuthStore } from '../../store/authStore';

import GuestHome from './components/GuestHome/GuestHome';
import LoggedInHome from './components/LoggedInHome/LoggedInHome';

export default function MainScreen() {
  const isLoggedIn = useAuthStore(s => s.isLoggedIn);

  // ✅ 완전 다른 레이아웃 분기
  if (!isLoggedIn) return <GuestHome />;

  return <LoggedInHome />;
}
