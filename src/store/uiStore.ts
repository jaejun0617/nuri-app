// 파일: src/store/uiStore.ts
// 역할:
// - 전역 toast 상태 관리
// - 화면별 Alert 남발 대신 짧은 피드백을 공용으로 띄우기 위한 UI store

import { create } from 'zustand';

export type ToastTone = 'info' | 'success' | 'warning' | 'error';

export type ToastPayload = {
  title?: string | null;
  message: string;
  tone?: ToastTone;
  durationMs?: number;
};

type ToastState = {
  visible: boolean;
  title: string | null;
  message: string;
  tone: ToastTone;
  durationMs: number;
  moreDrawerOpen: boolean;
  showToast: (payload: ToastPayload) => void;
  hideToast: () => void;
  openMoreDrawer: () => void;
  closeMoreDrawer: () => void;
};

let hideTimer: ReturnType<typeof setTimeout> | null = null;

function clearHideTimer() {
  if (!hideTimer) return;
  clearTimeout(hideTimer);
  hideTimer = null;
}

export const useUiStore = create<ToastState>(set => ({
  visible: false,
  title: null,
  message: '',
  tone: 'info',
  durationMs: 2200,
  moreDrawerOpen: false,
  showToast: payload => {
    clearHideTimer();

    const durationMs = Math.max(1400, payload.durationMs ?? 2200);

    set({
      visible: true,
      title: payload.title?.trim() || null,
      message: payload.message.trim(),
      tone: payload.tone ?? 'info',
      durationMs,
    });

    hideTimer = setTimeout(() => {
      set({ visible: false });
      hideTimer = null;
    }, durationMs);
  },
  hideToast: () => {
    clearHideTimer();
    set({ visible: false });
  },
  openMoreDrawer: () => set({ moreDrawerOpen: true }),
  closeMoreDrawer: () => set({ moreDrawerOpen: false }),
}));

export function showToast(payload: ToastPayload) {
  useUiStore.getState().showToast(payload);
}

export function hideToast() {
  useUiStore.getState().hideToast();
}

export function openMoreDrawer() {
  useUiStore.getState().openMoreDrawer();
}

export function closeMoreDrawer() {
  useUiStore.getState().closeMoreDrawer();
}
