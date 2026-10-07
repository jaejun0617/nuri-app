import {
  OTHER_SUBCATEGORY_OPTIONS,
  type MemoryMainCategory,
  type MemoryOtherSubCategory,
} from '../memories/categoryMeta';

export function getTimelineEmptyCopy(
  category: MemoryMainCategory,
  subcategory: MemoryOtherSubCategory | null,
): { title: string; description: string } {
  switch (category) {
    case 'walk':
      return {
        title: '아직 산책 기록이 없어요',
        description:
          '함께 걸었던 길과 즐거웠던 순간을 첫 산책 기록으로 남겨 보세요.',
      };
    case 'meal':
      return {
        title: '아직 식사 기록이 없어요',
        description: '우리 아이의 식사와 간식 시간을 차곡차곡 기록해 보세요.',
      };
    case 'diary':
      return {
        title: '아직 일기장에 남긴 추억이 없어요',
        description: '오늘 함께한 소중한 순간과 마음을 첫 일기로 남겨 보세요.',
      };
    case 'other': {
      const label = OTHER_SUBCATEGORY_OPTIONS.find(
        option => option.key === subcategory,
      )?.label;
      return {
        title: label
          ? `아직 ${label} 기록이 없어요`
          : '아직 생활 기록이 없어요',
        description: label
          ? `함께한 ${label} 순간을 생활 기록으로 남겨 보세요.`
          : '놀이, 미용, 외출처럼 함께한 일상의 순간을 남겨 보세요.',
      };
    }
    case 'health':
      return {
        title: '아직 건강 기록이 없어요',
        description: '우리 아이의 건강 기록을 남겨 보세요.',
      };
    default:
      return {
        title: '아직 남겨진 추억이 없어요',
        description:
          '우리 아이와 함께한 반짝이는 순간을 첫 기록으로 천천히 시작해 보세요.',
      };
  }
}
