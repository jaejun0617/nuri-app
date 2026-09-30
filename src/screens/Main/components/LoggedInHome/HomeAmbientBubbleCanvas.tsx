import React, { memo, useMemo } from 'react';
import { Image, StyleSheet, useWindowDimensions, View } from 'react-native';
import LinearGradient from 'react-native-linear-gradient';

import {
  getHomeAmbientBubbleSize,
  HOME_AMBIENT_BASE_GRADIENT,
  HOME_AMBIENT_HERO_BUBBLES,
  HOME_AMBIENT_HERO_LIGHTS,
  HOME_AMBIENT_MESH_BASE_COLOR,
  HOME_AMBIENT_MESH_FIELDS,
  HOME_AMBIENT_SCROLL_BUBBLES,
  HOME_AMBIENT_SCROLL_LIGHTS,
  type HomeAmbientBubble,
  type HomeAmbientLight,
  type HomeAmbientMeshField,
  type HomeAmbientSectionLayouts,
} from '../../../../theme/home/ambientMesh';

const PEARL_BUBBLE = require('../../../../assets/seasonal/home/autumn/bubbles/pearl-bubble-v1.png');
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

type BubbleProps = {
  bubble: HomeAmbientBubble;
  top: number | `${number}%`;
  windowWidth: number;
  testID?: string;
};

const AmbientBubble = memo(function AmbientBubbleView({
  bubble,
  top,
  windowWidth,
  testID,
}: BubbleProps) {
  const size = getHomeAmbientBubbleSize(bubble, windowWidth);

  return (
    <Image
      testID={testID}
      source={PEARL_BUBBLE}
      resizeMode="contain"
      accessible={false}
      fadeDuration={0}
      style={[
        styles.bubble,
        {
          top,
          left: Math.round(windowWidth * bubble.centerXRatio - size / 2),
          width: size,
          height: size,
          opacity: bubble.opacity,
          transform: [{ rotate: bubble.rotation }],
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
}: {
  light: HomeAmbientLight;
  top: number | `${number}%`;
  windowWidth: number;
}) {
  const size = Math.round(
    light.size * Math.min(1.08, Math.max(0.94, windowWidth / 400)),
  );

  return (
    <View
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
        style={styles.lightHalo}
      />
      <LinearGradient
        colors={LIGHT_COLORS}
        locations={FADE_LOCATIONS}
        style={styles.lightVertical}
      />
      <LinearGradient
        colors={LIGHT_COLORS}
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
  }: {
    heroHeight: number;
    sectionLayouts?: HomeAmbientSectionLayouts;
    sectionOrigin?: number;
  }) {
    const { width: windowWidth } = useWindowDimensions();
    const lowerLayerStyle = useMemo(() => ({ top: heroHeight }), [heroHeight]);

    return (
      <View
        testID="home-ambient-bubble-canvas"
        pointerEvents="none"
        accessible={false}
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
        style={styles.canvas}
      >
        <LinearGradient
          colors={[...HOME_AMBIENT_BASE_GRADIENT]}
          locations={[0, 0.26, 0.54, 0.78, 1]}
          style={StyleSheet.absoluteFill}
        />

        {HOME_AMBIENT_MESH_FIELDS.map((field, index) => (
          <DiffuseField
            key={`field-${index}`}
            field={field}
            windowWidth={windowWidth}
          />
        ))}

        <LinearGradient
          colors={[
            'rgba(255, 255, 255, 0)',
            'rgba(255, 255, 255, 0.38)',
            'rgba(255, 255, 255, 0)',
          ]}
          locations={[0, 0.5, 1]}
          start={{ x: 0, y: 0.5 }}
          end={{ x: 1, y: 0.5 }}
          style={StyleSheet.absoluteFill}
        />

        {heroHeight > 0 ? (
          <>
            {HOME_AMBIENT_HERO_BUBBLES.map((bubble, index) => (
              <AmbientBubble
                key={`hero-bubble-${index}`}
                bubble={bubble}
                top={Math.round(heroHeight * bubble.topRatio)}
                windowWidth={windowWidth}
              />
            ))}
            {HOME_AMBIENT_HERO_LIGHTS.map((light, index) => (
              <AmbientLight
                key={`hero-light-${index}`}
                light={light}
                top={Math.round(heroHeight * light.topRatio)}
                windowWidth={windowWidth}
              />
            ))}
            <View
              testID="home-ambient-lower-layer"
              style={[styles.lowerLayer, lowerLayerStyle]}
            >
              {HOME_AMBIENT_SCROLL_BUBBLES.map((bubble, index) => {
                const layout = sectionLayouts[bubble.zone];
                if (!layout && bubble.zone !== 'weather') return null;
                const size = getHomeAmbientBubbleSize(bubble, windowWidth);
                const top = layout
                  ? sectionOrigin +
                    layout.y +
                    (layout.height * parseFloat(bubble.top)) / 100 -
                    heroHeight -
                    size / 2
                  : bubble.top;
                return (
                  <AmbientBubble
                    key={`lower-bubble-${index}`}
                    bubble={bubble}
                    testID={`home-ambient-lower-bubble-${index}`}
                    top={top}
                    windowWidth={windowWidth}
                  />
                );
              })}
              {HOME_AMBIENT_SCROLL_LIGHTS.map((light, index) => (
                <AmbientLight
                  key={`lower-light-${index}`}
                  light={light}
                  top={light.top}
                  windowWidth={windowWidth}
                />
              ))}
            </View>
          </>
        ) : null}
      </View>
    );
  },
);

const styles = StyleSheet.create({
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
