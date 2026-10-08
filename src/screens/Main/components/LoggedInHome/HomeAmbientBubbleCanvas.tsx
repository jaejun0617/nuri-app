import React, { memo, useMemo } from 'react';
import {
  Image,
  StyleSheet,
  useWindowDimensions,
  View,
  type ImageSourcePropType,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';

import {
  getHomeAmbientBubbleSize,
  HOME_AMBIENT_HERO_BUBBLES,
  HOME_AMBIENT_HERO_LIGHTS,
  HOME_AMBIENT_MESH_BASE_COLOR,
  HOME_AMBIENT_SCROLL_BUBBLES,
  type HomeAmbientBubble,
  type HomeAmbientLight,
  type HomeAmbientMeshField,
  type HomeAmbientSectionLayouts,
} from '../../../../theme/home/ambientMesh';
import {
  getHomeAmbientVisual,
  HOME_AMBIENT_SECTION_LIGHTS,
  type HomeAmbientAnchoredField,
} from '../../../../theme/home/seasonalAmbient';
import type { SeasonKey } from '../../../../theme/seasonal/season';

const SOFT_RADIAL_GLOW = require('../../../../assets/seasonal/home/autumn/bubbles/soft-radial-glow-v1.png');
const FADE_LOCATIONS = [0, 0.12, 0.3, 0.5, 0.7, 0.88, 1];
const LIGHT_COLORS = [
  'rgba(255, 255, 255, 0)',
  'rgba(255, 253, 234, 0.16)',
  'rgba(255, 255, 248, 0.85)',
  '#FFFFFF',
  'rgba(255, 255, 248, 0.85)',
  'rgba(255, 253, 234, 0.16)',
  'rgba(255, 255, 255, 0)',
];
const COOL_LIGHT_COLORS = [
  'rgba(255, 255, 255, 0)',
  'rgba(255, 255, 255, 0.16)',
  'rgba(255, 255, 255, 0.85)',
  '#FFFFFF',
  'rgba(255, 255, 255, 0.85)',
  'rgba(255, 255, 255, 0.16)',
  'rgba(255, 255, 255, 0)',
];

type BubbleProps = {
  bubble: HomeAmbientBubble;
  top: number | `${number}%`;
  windowWidth: number;
  testID?: string;
  texture: ImageSourcePropType;
};

const AmbientBubble = memo(function AmbientBubbleView({
  bubble,
  top,
  windowWidth,
  testID,
  texture,
}: BubbleProps) {
  const size = getHomeAmbientBubbleSize(bubble, windowWidth);
  const bubbleStyle = [
    styles.bubble,
    {
      top,
      left: Math.round(windowWidth * bubble.centerXRatio - size / 2),
      width: size,
      height: size,
      opacity: bubble.opacity,
      transform: [{ rotate: bubble.rotation }],
    },
  ];

  return (
    <Image
      testID={testID}
      source={texture}
      resizeMode="contain"
      accessible={false}
      fadeDuration={0}
      style={bubbleStyle}
    />
  );
});

const AnchoredDiffuseField = memo(function AnchoredDiffuseFieldView({
  field,
  origin,
  referenceHeight,
  windowWidth,
  testID,
}: {
  field: HomeAmbientAnchoredField;
  origin: number;
  referenceHeight: number;
  windowWidth: number;
  testID: string;
}) {
  const width = Math.round(windowWidth * field.widthRatio);
  const height = Math.round(
    Math.max(windowWidth * 1.5, referenceHeight * field.heightRatio),
  );

  return (
    <Image
      testID={testID}
      source={SOFT_RADIAL_GLOW}
      resizeMode="stretch"
      accessible={false}
      fadeDuration={0}
      style={[
        styles.diffuseField,
        {
          top: Math.round(
            origin + referenceHeight * field.centerYRatio - height / 2,
          ),
          left: Math.round(windowWidth * field.centerXRatio - width / 2),
          width,
          height,
          opacity: field.opacity,
          tintColor: field.color,
        },
      ]}
    />
  );
});

const DiffuseField = memo(function DiffuseFieldView({
  field,
  windowWidth,
}: {
  field: HomeAmbientMeshField;
  windowWidth: number;
}) {
  const width = Math.round(windowWidth * 2 * field.widthRatio);
  const height = Math.round(windowWidth * 2 * field.heightRatio);

  return (
    <Image
      source={SOFT_RADIAL_GLOW}
      resizeMode="stretch"
      accessible={false}
      fadeDuration={0}
      style={[
        styles.diffuseField,
        {
          top: field.top,
          left: Math.round(windowWidth * field.centerXRatio - width / 2),
          width,
          height,
          opacity: field.opacity,
          tintColor: field.colors[1],
        },
      ]}
    />
  );
});

const AmbientLight = memo(function AmbientLightView({
  light,
  top,
  windowWidth,
  haloColor,
  colors,
  testID,
}: {
  light: HomeAmbientLight;
  top: number | `${number}%`;
  windowWidth: number;
  haloColor: string;
  colors: string[];
  testID?: string;
}) {
  const size = Math.round(
    light.size * Math.min(1.08, Math.max(0.94, windowWidth / 400)),
  );

  return (
    <View
      testID={testID}
      style={[
        styles.light,
        {
          top,
          left: Math.round(windowWidth * light.centerXRatio - size / 2),
          width: size,
          height: size,
          opacity: light.opacity,
        },
      ]}
    >
      <Image
        source={SOFT_RADIAL_GLOW}
        resizeMode="stretch"
        accessible={false}
        fadeDuration={0}
        style={[styles.lightHalo, { tintColor: haloColor }]}
      />
      <LinearGradient
        colors={colors}
        locations={FADE_LOCATIONS}
        style={styles.lightVertical}
      />
      <LinearGradient
        colors={colors}
        locations={FADE_LOCATIONS}
        start={{ x: 0, y: 0.5 }}
        end={{ x: 1, y: 0.5 }}
        style={styles.lightHorizontal}
      />
    </View>
  );
});

/** One absolute owner follows actual scroll content, without measuring it again. */
export const HomeAmbientBubbleCanvas = memo(
  function HomeAmbientBubbleCanvasView({
    heroHeight,
    sectionLayouts = {},
    sectionOrigin = 0,
    season = 'autumn',
    decorationMode = 'home',
    showDecorations = true,
  }: {
    heroHeight: number;
    sectionLayouts?: HomeAmbientSectionLayouts;
    sectionOrigin?: number;
    season?: SeasonKey;
    decorationMode?: 'home' | 'reading';
    showDecorations?: boolean;
  }) {
    const { width: windowWidth } = useWindowDimensions();
    const visual = getHomeAmbientVisual(season);
    const lightColors = season === 'autumn' ? LIGHT_COLORS : COOL_LIGHT_COLORS;
    const lowerLayerStyle = useMemo(() => ({ top: heroHeight }), [heroHeight]);

    return (
      <View
        testID="home-ambient-bubble-canvas"
        pointerEvents="none"
        accessible={false}
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
        style={[
          styles.canvas,
          decorationMode === 'reading' && styles.readingCanvas,
          { backgroundColor: visual.baseColor },
        ]}
      >
        <LinearGradient
          colors={[...visual.baseGradient]}
          locations={[0, 0.26, 0.54, 0.78, 1]}
          style={StyleSheet.absoluteFill}
        />

        {visual.fields.map((field, index) => (
          <DiffuseField
            key={`field-${index}`}
            field={field}
            windowWidth={windowWidth}
          />
        ))}

        {heroHeight > 0
          ? visual.heroFields.map((field, index) => (
              <AnchoredDiffuseField
                key={`hero-field-${index}`}
                testID={`home-ambient-hero-field-${index}`}
                field={field}
                origin={0}
                referenceHeight={heroHeight}
                windowWidth={windowWidth}
              />
            ))
          : null}

        <LinearGradient
          testID="home-ambient-hero-center-wash"
          colors={[
            'rgba(255, 255, 255, 0)',
            `rgba(255, 255, 255, ${visual.centerWashOpacity})`,
            'rgba(255, 255, 255, 0)',
          ]}
          locations={[0, 0.5, 1]}
          start={{ x: 0, y: 0.5 }}
          end={{ x: 1, y: 0.5 }}
          style={[styles.heroWash, { height: heroHeight }]}
        />

        {heroHeight > 0 && decorationMode === 'home' ? (
          <>
            {/* Edge-only color persists between fields; the center stays transparent. */}
            <LinearGradient
              testID="home-ambient-lower-edge-wash"
              colors={[...visual.lowerEdgeWash]}
              locations={[0, 0.24, 0.5, 0.76, 1]}
              start={{ x: 0, y: 0.5 }}
              end={{ x: 1, y: 0.5 }}
              style={[styles.lowerLayer, lowerLayerStyle]}
            />
            <LinearGradient
              testID="home-ambient-edge-handoff"
              colors={[visual.baseColor, `${visual.baseColor}00`]}
              style={[
                styles.heroWash,
                { top: heroHeight, height: Math.round(windowWidth * 0.42) },
              ]}
            />
            {/* Transparent field overlap preserves color movement across the Hero tail. */}
            {sectionOrigin > heroHeight
              ? visual.sectionFields
                  .slice(0, 2)
                  .map((field, index) => (
                    <AnchoredDiffuseField
                      key={`weather-field-${index}`}
                      testID={`home-ambient-weather-field-${index}`}
                      field={field}
                      origin={heroHeight}
                      referenceHeight={sectionOrigin - heroHeight}
                      windowWidth={windowWidth}
                    />
                  ))
              : null}
            {visual.sectionFields.map((field, index) => {
              const layout = sectionLayouts[field.zone];
              if (!layout) return null;
              return (
                <AnchoredDiffuseField
                  key={`section-field-${index}`}
                  testID={`home-ambient-section-field-${index}`}
                  field={field}
                  origin={sectionOrigin + layout.y}
                  referenceHeight={layout.height}
                  windowWidth={windowWidth}
                />
              );
            })}
          </>
        ) : null}

        {heroHeight > 0 && decorationMode === 'home' && showDecorations ? (
          <>
            {HOME_AMBIENT_HERO_BUBBLES.map((bubble, index) => (
              <AmbientBubble
                key={`hero-bubble-${index}`}
                testID={`home-ambient-hero-bubble-${index}`}
                bubble={bubble}
                top={Math.round(heroHeight * bubble.topRatio)}
                windowWidth={windowWidth}
                texture={visual.bubbleTexture}
              />
            ))}
            {HOME_AMBIENT_HERO_LIGHTS.map((light, index) => (
              <AmbientLight
                key={`hero-light-${index}`}
                light={light}
                top={Math.round(heroHeight * light.topRatio)}
                windowWidth={windowWidth}
                haloColor={visual.lightHalo}
                colors={lightColors}
              />
            ))}
            <View
              testID="home-ambient-lower-layer"
              style={[styles.lowerLayer, lowerLayerStyle]}
            >
              {HOME_AMBIENT_SCROLL_BUBBLES.map((bubble, index) => {
                const layout = sectionLayouts[bubble.zone];
                if (!layout && bubble.zone !== 'weather') return null;
                if (bubble.zone === 'weather' && sectionOrigin <= heroHeight) {
                  return null;
                }
                const size = getHomeAmbientBubbleSize(bubble, windowWidth);
                const origin = layout ? sectionOrigin + layout.y : heroHeight;
                const height = layout
                  ? layout.height
                  : sectionOrigin - heroHeight;
                let centerY =
                  (height * parseFloat(bubble.top)) / 100 +
                  (bubble.offsetY ?? 0);
                // Complete Weather spheres stay inside the measured handoff space.
                if (bubble.zone === 'weather' && bubble.kind === 'medium') {
                  if (height < size + 16) return null;
                  centerY = Math.min(
                    height - size / 2 - 8,
                    Math.max(size / 2 + 8, centerY),
                  );
                }
                const top = Math.round(
                  origin + centerY - heroHeight - size / 2,
                );
                return (
                  <AmbientBubble
                    key={`lower-bubble-${index}`}
                    bubble={bubble}
                    testID={`home-ambient-lower-bubble-${index}`}
                    top={top}
                    windowWidth={windowWidth}
                    texture={visual.bubbleTexture}
                  />
                );
              })}
              {HOME_AMBIENT_SECTION_LIGHTS.map((light, index) => {
                const layout = sectionLayouts[light.zone];
                if (!layout && light.zone !== 'weather') return null;
                if (light.zone === 'weather' && sectionOrigin <= heroHeight) {
                  return null;
                }
                const origin = layout ? sectionOrigin + layout.y : heroHeight;
                const height = layout
                  ? layout.height
                  : sectionOrigin - heroHeight;
                const top = Math.round(
                  origin + height * light.topRatio - heroHeight,
                );
                return (
                  <AmbientLight
                    key={`lower-light-${index}`}
                    testID={`home-ambient-lower-light-${index}`}
                    light={light}
                    top={top}
                    windowWidth={windowWidth}
                    haloColor={visual.lightHalo}
                    colors={lightColors}
                  />
                );
              })}
            </View>
          </>
        ) : null}
        {decorationMode === 'reading' && showDecorations ? (
          <>
            {[0.16, 0.88].map((ratio, index) => (
              <AmbientBubble
                key={`reading-bubble-${index}`}
                testID={`schedule-ambient-edge-bubble-${index}`}
                bubble={{
                  kind: 'small',
                  centerXRatio: index === 0 ? -0.014 : 1.014,
                  sizeRatio: 0.13,
                  minimumSize: 36,
                  maximumSize: 56,
                  opacity: 0.62,
                  rotation: '0deg',
                }}
                top={Math.round(heroHeight * ratio)}
                windowWidth={windowWidth}
                texture={visual.bubbleTexture}
              />
            ))}
            {[0.38, 0.7].map((ratio, index) => (
              <AmbientLight
                key={`reading-light-${index}`}
                light={{
                  centerXRatio: index === 0 ? 0.018 : 0.982,
                  size: 9,
                  opacity: 0.48,
                }}
                top={Math.round(heroHeight * ratio)}
                windowWidth={windowWidth}
                haloColor={visual.lightHalo}
                colors={lightColors}
              />
            ))}
          </>
        ) : null}
      </View>
    );
  },
);

const styles = StyleSheet.create({
  readingCanvas: { left: 0, right: 0 },
  canvas: {
    position: 'absolute',
    top: 0,
    right: -16,
    bottom: 0,
    left: -16,
    overflow: 'hidden',
    backgroundColor: HOME_AMBIENT_MESH_BASE_COLOR,
  },
  diffuseField: {
    position: 'absolute',
  },
  heroWash: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
  },
  bubble: {
    position: 'absolute',
  },
  lowerLayer: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
  },
  light: {
    position: 'absolute',
  },
  lightHalo: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    tintColor: '#FFFDEB',
    opacity: 0.8,
  },
  lightVertical: {
    position: 'absolute',
    left: '38%',
    width: '24%',
    height: '100%',
  },
  lightHorizontal: {
    position: 'absolute',
    top: '38%',
    width: '100%',
    height: '24%',
  },
});
