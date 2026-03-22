import React, { memo, useCallback, useMemo, useState } from 'react';
import {
  FlatList,
  Image,
  type NativeSyntheticEvent,
  type NativeScrollEvent,
  type ListRenderItem,
  StyleSheet,
  View,
  useWindowDimensions,
} from 'react-native';
import { useTheme } from 'styled-components/native';

type PostImageSliderProps = {
  imageUrls: string[];
};

type SlideImageItemProps = {
  uri: string;
  width: number;
};

function SlideSeparator() {
  return <View style={styles.slideGap} />;
}

const SlideImageItem = memo(function SlideImageItem(
  props: SlideImageItemProps,
) {
  return (
    <Image
      source={{ uri: props.uri }}
      style={[styles.slideImage, { width: props.width }]}
      resizeMode="cover"
    />
  );
});

const HORIZONTAL_INSET = 40;
const IMAGE_HEIGHT = 260;
const SLIDE_GAP = 8;

function PostImageSlider(props: PostImageSliderProps) {
  const theme = useTheme();
  const { width: windowWidth } = useWindowDimensions();
  const [currentIndex, setCurrentIndex] = useState(0);

  const imageUrls = useMemo(
    () =>
      props.imageUrls
        .map(url => `${url ?? ''}`.trim())
        .filter(url => url.length > 0),
    [props.imageUrls],
  );

  const sliderWidth = Math.max(windowWidth - HORIZONTAL_INSET, 1);
  const slideInterval = sliderWidth + SLIDE_GAP;

  const keyExtractor = useCallback(
    (item: string, index: number) => `${item}-${index}`,
    [],
  );

  const renderItem = useCallback<ListRenderItem<string>>(
    ({ item }) => <SlideImageItem uri={item} width={sliderWidth} />,
    [sliderWidth],
  );

  const handleMomentumScrollEnd = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      const nextIndex = Math.round(
        event.nativeEvent.contentOffset.x / slideInterval,
      );
      setCurrentIndex(previousIndex =>
        previousIndex === nextIndex ? previousIndex : nextIndex,
      );
    },
    [slideInterval],
  );

  if (imageUrls.length === 0) {
    return null;
  }

  if (imageUrls.length === 1) {
    return (
      <Image
        source={{ uri: imageUrls[0] }}
        style={styles.singleImage}
        resizeMode="cover"
      />
    );
  }

  return (
    <View>
      <FlatList
        data={imageUrls}
        renderItem={renderItem}
        horizontal
        showsHorizontalScrollIndicator={false}
        snapToInterval={slideInterval}
        snapToAlignment="start"
        decelerationRate="normal"
        disableIntervalMomentum
        bounces={false}
        overScrollMode="never"
        scrollEventThrottle={16}
        getItemLayout={(_, index) => ({
          length: slideInterval,
          offset: slideInterval * index,
          index,
        })}
        keyExtractor={keyExtractor}
        removeClippedSubviews
        initialNumToRender={1}
        maxToRenderPerBatch={1}
        windowSize={3}
        ItemSeparatorComponent={SlideSeparator}
        onMomentumScrollEnd={handleMomentumScrollEnd}
      />

      <View style={styles.dotRow}>
        {imageUrls.map((_, index) => {
          const active = index === currentIndex;
          return (
            <View
              key={`dot-${index}`}
              style={[
                styles.dot,
                {
                  backgroundColor: active
                    ? theme.colors.textPrimary
                    : theme.colors.border,
                  opacity: active ? 1 : 0.7,
                },
              ]}
            />
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  singleImage: {
    width: '100%',
    height: IMAGE_HEIGHT,
    borderRadius: 18,
  },
  slideImage: {
    height: IMAGE_HEIGHT,
    borderRadius: 18,
  },
  slideGap: {
    width: SLIDE_GAP,
  },
  dotRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
    marginTop: 10,
  },
  dot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
  },
});

export default memo(PostImageSlider);
