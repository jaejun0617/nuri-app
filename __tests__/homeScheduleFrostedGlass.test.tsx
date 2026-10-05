import React from 'react';
import {
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import TestRenderer, { act } from 'react-test-renderer';
import { BlurView } from '@sbaiahmed1/react-native-blur';

import {
  HOME_SCHEDULE_FROST_BLUR_AMOUNT,
  HOME_SCHEDULE_FROST_BLUR_ROUNDS,
  HomeScheduleFrostedGlass,
  resolveHomeScheduleFrostedMaterial,
} from '../src/components/home/HomeScheduleFrostedGlass';
import { styles as homeStyles } from '../src/screens/Main/components/LoggedInHome/LoggedInHome.styles';
import { getHomeAmbientVisual } from '../src/theme/home/seasonalAmbient';
import { HomeSectionGlass } from '../src/components/home/HomeSectionGlass';
import { HomeSeasonProvider } from '../src/components/home/HomeSeasonContext';
import * as seasonPreference from '../src/app/providers/SeasonPreferenceProvider';
import { HomeFrostedGlass } from '../src/components/home/HomeFrostedGlass';

describe('Shared Home frosted glass through the pilot API', () => {
  afterEach(() => jest.restoreAllMocks());

  it('keeps the rim and native clipping on the same per-corner geometry', async () => {
    let renderer!: TestRenderer.ReactTestRenderer;
    await act(async () => {
      renderer = TestRenderer.create(<HomeFrostedGlass season="autumn" borderRadius={24} style={{ borderBottomLeftRadius: 0, borderBottomRightRadius: 0 }}><Text>일정</Text></HomeFrostedGlass>);
    });
    const blur = renderer.root.findByType(BlurView);
    const rim = renderer.root.findByProps({ testID: 'home-frosted-tint' });
    for (const node of [blur, rim]) {
      expect(StyleSheet.flatten(node.props.style)).toMatchObject({ borderTopLeftRadius: 24, borderTopRightRadius: 24, borderBottomLeftRadius: 0, borderBottomRightRadius: 0 });
    }
    await act(async () => renderer.unmount());
  });

  it('allows a denser modal frost without changing the shared Home default', async () => {
    let renderer!: TestRenderer.ReactTestRenderer;
    await act(async () => {
      renderer = TestRenderer.create(<HomeFrostedGlass season="autumn" blurAmount={24} blurRounds={1}><Text>일정</Text></HomeFrostedGlass>);
    });
    expect(renderer.root.findByType(BlurView).props.blurAmount).toBe(24);
    expect(renderer.root.findByType(BlurView).props.blurRounds).toBe(1);
    await act(async () => renderer.update(<HomeFrostedGlass season="autumn"><Text>일정</Text></HomeFrostedGlass>));
    expect(renderer.root.findByType(BlurView).props.blurAmount).toBe(18);
    expect(renderer.root.findByType(BlurView).props.blurRounds).toBe(2);
    await act(async () => renderer.unmount());
  });

  it('changes only the ambient frost while retaining foreground ownership and mounted content', async () => {
    const effectiveSeason = jest.spyOn(seasonPreference, 'useEffectiveSeason').mockReturnValue('autumn');
    const mounted = jest.fn();
    const unmounted = jest.fn();
    function Content() {
      React.useEffect(() => { mounted(); return unmounted; }, []);
      return <Text testID="retained-content">원본 아이콘과 글자</Text>;
    }
    const tree = () => <HomeSeasonProvider season="autumn"><HomeSectionGlass><Content /></HomeSectionGlass></HomeSeasonProvider>;
    let renderer!: TestRenderer.ReactTestRenderer;
    await act(async () => { renderer = TestRenderer.create(tree()); });
    for (const season of ['autumn', 'winter', 'spring', 'summer'] as const) {
      effectiveSeason.mockReturnValue(season);
      await act(async () => renderer.update(tree()));
      expect(renderer.root.findByType(BlurView).props.reducedTransparencyFallbackColor).toBe(getHomeAmbientVisual(season).baseColor);
      expect(renderer.root.findByProps({ testID: 'retained-content' })).toBeDefined();
    }
    expect(mounted).toHaveBeenCalledTimes(1);
    expect(unmounted).not.toHaveBeenCalled();
    await act(async () => renderer.unmount());
  });

  it.each(['autumn', 'winter', 'spring', 'summer'] as const)(
    'keeps a light %s tint, a restrained rim, and an opaque accessibility fallback',
    season => {
      const material = resolveHomeScheduleFrostedMaterial(season);
      expect(material.backgroundColor).toContain('0.10');
      expect(material.borderColor).toBe('rgba(255, 255, 255, 0.42)');
      expect(material.reducedTransparencyFallbackColor).toBe(
        getHomeAmbientVisual(season).baseColor,
      );
    },
  );

  it.each(['android', 'ios'] as const)(
    'keeps content sharp and touchable inside the %s native blur subtree',
    async os => {
      jest.replaceProperty(Platform, 'OS', os);
      const onPress = jest.fn();
      let renderer: TestRenderer.ReactTestRenderer | undefined;
      await act(async () => {
        renderer = TestRenderer.create(
          <HomeScheduleFrostedGlass
            testID="schedule"
            season="spring"
            style={homeStyles.section}
          >
            <Text testID="schedule-title">일정 보기</Text>
            <TouchableOpacity testID="add-schedule" onPress={onPress}>
              <Text>일정 추가하기</Text>
            </TouchableOpacity>
          </HomeScheduleFrostedGlass>,
        );
      });
      if (!renderer) throw new Error('Schedule frost did not render');
      const blur = renderer.root.findByType(BlurView);
      expect(blur.props.blurType).toBe(
        os === 'ios' ? 'systemUltraThinMaterialLight' : 'regular',
      );
      expect(blur.props.blurAmount).toBe(HOME_SCHEDULE_FROST_BLUR_AMOUNT);
      expect(blur.props.blurRounds).toBe(HOME_SCHEDULE_FROST_BLUR_ROUNDS);
      expect(blur.props.blurRounds).toBe(2);
      expect(blur.props.pointerEvents).toBe('box-none');
      expect(blur.props.importantForAccessibility).not.toBe(
        'no-hide-descendants',
      );
      const frame = StyleSheet.flatten(blur.props.style);
      expect(frame).toMatchObject({
        width: '100%',
        marginTop: 12,
        ...homeStyles.section,
        borderRadius: 22,
        borderWidth: 0,
        overflow: 'hidden',
        backgroundColor: 'transparent',
        elevation: 0,
        shadowOpacity: 0,
      });
      expect(frame).not.toHaveProperty('height');
      expect(frame).not.toHaveProperty('minHeight');
      expect(frame).not.toHaveProperty('filter');
      expect(frame).not.toHaveProperty('opacity');
      const tint = blur
        .findAllByType(View)
        .find(item => item.props.testID === 'home-frosted-tint');
      if (!tint) throw new Error('Schedule frost tint did not render');
      expect(tint.props.pointerEvents).toBe('none');
      expect(tint.props.importantForAccessibility).toBe('no-hide-descendants');
      expect(StyleSheet.flatten(tint.props.style)).toMatchObject({
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        borderWidth: 1,
        backgroundColor:
          resolveHomeScheduleFrostedMaterial('spring').backgroundColor,
      });
      expect(blur.findByProps({ testID: 'schedule-title' }).type).toBe(Text);
      blur.findByProps({ testID: 'add-schedule' }).props.onPress();
      expect(onPress).toHaveBeenCalledTimes(1);
      await act(async () => renderer?.unmount());
    },
  );
});
