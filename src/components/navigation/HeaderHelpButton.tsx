import React, { useState } from 'react';
import { Pressable, StyleSheet } from 'react-native';
import NuriSemanticIcon from '../icons/NuriSemanticIcon';
import PremiumNoticeModal from '../common/PremiumNoticeModal';
import { APP_HEADER } from './headerAppearance';

export const HEADER_HELP = {
  petCreate: {
    title: '프로필 등록 안내',
    body: ['기본 정보를 입력한 뒤 다음 단계에서 아이의 이야기를 더할 수 있어요.', '등록 완료를 누르기 전에는 새 프로필이 만들어지지 않아요.'],
  },
  petEdit: {
    title: '프로필 수정 안내',
    body: ['사진과 기본 정보, 아이의 이야기를 수정할 수 있어요.', '몸무게는 체중 기록에서 관리하며, 변경한 프로필은 수정하기를 눌러 저장해 주세요.'],
  },
  petManagement: {
    title: '아이들 프로필 관리 안내',
    body: ['프로필을 수정하거나 함께 보고 싶은 아이를 선택할 수 있어요.', '사진과 기본 정보는 프로필 수정에서 변경해 주세요.', '프로필 삭제는 각 아이의 관리 메뉴에서 안내를 확인한 뒤 진행할 수 있어요.'],
  },
  timeline: {
    title: '타임라인 안내',
    body: ['선택한 아이의 기록을 월과 종류별로 모아 볼 수 있어요.', '최신순과 오래된순을 바꾸거나 기록을 눌러 자세히 확인해 주세요.'],
  },
  community: {
    title: '커뮤니티 안내',
    body: ['주제와 정렬을 선택하거나 검색으로 이야기를 찾아보세요.', '개인정보를 공개하지 않도록 주의하고, 부적절한 게시글과 댓글은 신고해 주세요.'],
  },
  hospital: {
    title: '동물병원 정보 안내',
    body: ['검색 결과와 운영시간은 실제 현황과 다를 수 있어요.', '방문 전 병원에 진료 가능 여부와 운영시간을 확인해 주세요.', '표시된 정보만으로 진료 품질이나 아이에게 맞는 병원을 보장하지 않아요.'],
  },
  walkPlaces: {
    title: '산책 장소 정보 안내',
    body: ['주변 장소 정보는 산책을 준비할 때 참고하는 자료예요.', '반려동물 출입과 이용시간은 현장 안내를 먼저 확인해 주세요.', '거리와 장소 정보는 실제 현황과 다를 수 있으며, 표시만으로 안전이나 추천을 보장하지 않아요.'],
  },
  walkHistory: {
    title: '산책 이력 안내',
    body: ['선택한 아이에게 저장된 산책 기록을 모아 보여드려요.', '기록에 표시된 거리와 시간은 해당 산책에서 저장된 측정값이에요.'],
  },
  indoorActivity: {
    title: '실내 활동 안내',
    body: ['아이와 함께할 수 있는 활동을 살펴보는 참고 가이드예요.', '아이의 나이와 컨디션, 주변 환경에 맞게 활동을 선택해 주세요.', '아이에게 불편한 반응이 보이면 활동을 멈추고 상태를 살펴 주세요.'],
  },
} as const;

export function HeaderHelpButton({ topic, color = '#19152F' }: {
  topic: keyof typeof HEADER_HELP;
  color?: string;
}) {
  const [visible, setVisible] = useState(false);
  const help = HEADER_HELP[topic];
  return <>
    <Pressable testID={`header-help-${topic}`} accessibilityRole="button"
      accessibilityLabel={help.title} style={styles.button} onPress={() => setVisible(true)}>
      <NuriSemanticIcon family="feather" name="info" size={APP_HEADER.actionIconSize} color={color} preserveOriginal />
    </Pressable>
    {visible ? <PremiumNoticeModal visible eyebrow="NURI" iconName="shield" titleLines={[help.title]}
      bodyLines={help.body} confirmLabel="알겠어요" surfaceVariant="menuGlass" typographyMode="unified"
      onClose={() => setVisible(false)} /> : null}
  </>;
}

const styles = StyleSheet.create({
  button: { minWidth: APP_HEADER.targetSize, minHeight: APP_HEADER.targetSize, alignItems: 'center', justifyContent: 'center' },
});
