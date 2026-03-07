// 파일: src/screens/Records/RecordDetailScreen.styles.ts
// 역할:
// - 추억 상세 피드 화면의 인스타그램형 카드 레이아웃 스타일 정의
// - 상단 헤더, 피드 카드, 액션 메뉴, 삭제 확인 모달 톤을 한 곳에서 관리

import { StyleSheet } from 'react-native';

export const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#F6F7FB',
  },
  header: {
    height: 56,
    justifyContent: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#E9ECF2',
    backgroundColor: '#FFFFFF',
  },
  headerTitle: {
    textAlign: 'center',
    color: '#111827',
    fontWeight: '800',
  },

  scroll: {
    flex: 1,
  },
  body: {
    paddingTop: 10,
    paddingBottom: 120,
    gap: 12,
  },

  postCard: {
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#E8EBF2',
  },
  postHeader: {
    minHeight: 60,
    paddingHorizontal: 14,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  postHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  postAvatar: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#F1E1D0',
  },
  postAvatarFallback: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  postAvatarFallbackText: {
    color: '#8B5E3C',
    fontWeight: '700',
  },
  postHeaderTextWrap: {
    flex: 1,
    gap: 2,
  },
  postPetName: {
    color: '#101828',
    fontWeight: '700',
  },
  postMetaLine: {
    color: '#98A2B3',
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  postMoreBtn: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  postImage: {
    width: '100%',
    aspectRatio: 1,
    backgroundColor: '#EFF2F7',
  },
  postImageFallback: {
    width: '100%',
    aspectRatio: 1,
    backgroundColor: '#F2F4FA',
    alignItems: 'center',
    justifyContent: 'center',
  },
  postImageFallbackText: {
    color: '#9CA7B8',
    fontWeight: '700',
  },
  postActions: {
    minHeight: 46,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  postActionsLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  postBody: {
    paddingHorizontal: 14,
    paddingBottom: 16,
    gap: 8,
  },
  postTitleText: {
    color: '#223047',
    fontSize: 16,
    lineHeight: 22,
    fontWeight: '500',
  },
  postContentText: {
    color: '#445065',
    lineHeight: 22,
  },
  postMoodRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  postMoodEmoji: {
    color: '#111827',
  },
  postMoodLabel: {
    color: '#667085',
    fontWeight: '600',
  },
  postTagsText: {
    color: '#7B88A2',
    lineHeight: 18,
    fontWeight: '600',
  },
  postDateText: {
    color: '#9AA4B7',
    fontWeight: '600',
  },
  feedLoading: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
  },

  sheetBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(12,18,32,0.28)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  sheetDismiss: {
    ...StyleSheet.absoluteFillObject,
  },
  actionSheet: {
    width: '100%',
    maxWidth: 320,
    borderRadius: 24,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E7EAF1',
    overflow: 'hidden',
    paddingVertical: 10,
  },
  sheetActionRow: {
    minHeight: 54,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 18,
  },
  sheetActionDivider: {
    height: 1,
    backgroundColor: '#EFF2F7',
  },
  sheetActionText: {
    color: '#243042',
    fontWeight: '700',
  },
  sheetActionDeleteText: {
    color: '#FF5A5F',
    fontWeight: '700',
  },

  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(12,18,32,0.44)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 26,
  },
  modalCard: {
    width: '100%',
    borderRadius: 28,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 22,
    paddingTop: 20,
    paddingBottom: 18,
    alignItems: 'center',
  },
  modalIconCircleDanger: {
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: 'rgba(255,77,79,0.10)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  modalTitle: {
    color: '#0B1220',
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: 10,
  },
  modalDesc: {
    color: '#8A94A6',
    textAlign: 'center',
    fontWeight: '600',
    lineHeight: 20,
  },
  modalPrimaryBtn: {
    width: '100%',
    height: 52,
    borderRadius: 26,
    backgroundColor: '#FF4D4F',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 12,
  },
  modalPrimaryBtnText: {
    color: '#FFFFFF',
    fontWeight: '800',
  },
  modalPrimaryBtnDisabled: {
    opacity: 0.6,
  },
  modalGhostBtn: {
    width: '100%',
    height: 52,
    borderRadius: 26,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 20,
    backgroundColor: '#FFFFFF',
  },
  modalGhostBtnText: {
    color: '#667085',
    fontWeight: '700',
  },

  empty: {
    margin: 14,
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    padding: 18,
    borderWidth: 1,
    borderColor: '#E6E8F0',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    flex: 1,
  },
  emptyTitle: {
    color: '#0B1220',
    fontWeight: '800',
  },
  emptyDesc: {
    color: '#556070',
    textAlign: 'center',
  },
});
