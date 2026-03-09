// 파일: src/components/records/RecordImageGallery.tsx
// 역할:
// - record 생성/수정 화면에서 공통으로 쓰는 이미지 미리보기 프레임을 제공
// - 메인 이미지, 빈 상태, 썸네일 목록, 활성 인덱스 전환을 한 곳에서 관리
// - 액션 위치/버튼 표현은 화면별로 다를 수 있어 render prop으로 주입 가능하게 설계

import React from 'react';
import {
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  type ImageStyle,
  type StyleProp,
  type TextStyle,
  type ViewStyle,
} from 'react-native';

type GalleryItem = {
  key: string;
  uri: string;
};

type RecordImageGalleryProps = {
  items: GalleryItem[];
  activeIndex: number;
  onChangeActiveIndex: (index: number) => void;
  containerStyle: StyleProp<ViewStyle>;
  stageStyle?: StyleProp<ViewStyle>;
  emptyContent: React.ReactNode;
  mainContent: React.ReactNode;
  topOverlay?: React.ReactNode;
  footerActions?: React.ReactNode;
  thumbRowStyle: StyleProp<ViewStyle>;
  thumbItemStyle: StyleProp<ViewStyle>;
  thumbItemActiveStyle?: StyleProp<ViewStyle>;
  thumbImageStyle: StyleProp<ImageStyle>;
  counterText?: string | null;
  counterBadgeStyle?: StyleProp<ViewStyle>;
  counterTextStyle?: StyleProp<TextStyle>;
};

export default function RecordImageGallery({
  items,
  activeIndex,
  onChangeActiveIndex,
  containerStyle,
  stageStyle,
  emptyContent,
  mainContent,
  topOverlay,
  footerActions,
  thumbRowStyle,
  thumbItemStyle,
  thumbItemActiveStyle,
  thumbImageStyle,
  counterText,
  counterBadgeStyle,
  counterTextStyle,
}: RecordImageGalleryProps) {
  return (
    <View style={containerStyle}>
      <View style={[recordImageGalleryStyles.defaultStage, stageStyle]}>
        {items.length === 0 ? emptyContent : mainContent}

        {topOverlay}

        {counterText ? (
          <View style={counterBadgeStyle}>
            <Text style={counterTextStyle}>{counterText}</Text>
          </View>
        ) : null}
      </View>

      {items.length > 1 ? (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={thumbRowStyle}
        >
          {items.map((item, index) => {
            const active = index === activeIndex;
            return (
              <TouchableOpacity
                key={item.key}
                activeOpacity={0.9}
                style={[thumbItemStyle, active ? thumbItemActiveStyle : null]}
                onPress={() => onChangeActiveIndex(index)}
              >
                <Image source={{ uri: item.uri }} style={thumbImageStyle} />
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      ) : null}

      {footerActions}
    </View>
  );
}

export const recordImageGalleryStyles = StyleSheet.create({
  defaultStage: {
    minHeight: 220,
    borderRadius: 24,
    overflow: 'hidden',
    position: 'relative',
  },
});
