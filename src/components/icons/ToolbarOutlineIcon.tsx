import React from 'react';
import { StyleSheet, View } from 'react-native';
import Feather from 'react-native-vector-icons/Feather';
import Ionicons from 'react-native-vector-icons/Ionicons';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';

export type ToolbarIconName = 'home' | 'timeline' | 'community' | 'guestbook' | 'more';

const size = 18;
const style = StyleSheet.create({
  glyph: { width: size, height: size, lineHeight: size, textAlign: 'center' },
});

export default function ToolbarOutlineIcon({ name, color }: { name: ToolbarIconName; color: string }) {
  const props = { color, size, allowFontScaling: false, style: style.glyph };
  const icons = {
    home: <Feather {...props} name="home" />,
    timeline: <MaterialCommunityIcons {...props} name="format-list-bulleted" />,
    community: <Ionicons {...props} name="chatbubble-ellipses-outline" />,
    guestbook: <Feather {...props} name="mail" />,
    more: <Ionicons {...props} name="grid-outline" />,
  };
  return (
    <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      {icons[name]}
    </View>
  );
}
