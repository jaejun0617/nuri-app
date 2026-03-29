import React, { useEffect, useState } from 'react';
import type { StyleProp, TextStyle, ViewStyle } from 'react-native';
import { TouchableOpacity, View } from 'react-native';

import AppText from '../../app/ui/AppText';

type Props = {
  text: string;
  collapsedLines?: number;
  textStyle?: StyleProp<TextStyle>;
  containerStyle?: StyleProp<ViewStyle>;
  toggleTextStyle?: StyleProp<TextStyle>;
};

export default function ExpandableBodyText({
  text,
  collapsedLines = 3,
  textStyle,
  containerStyle,
  toggleTextStyle,
}: Props) {
  const [expanded, setExpanded] = useState(false);
  const [canExpand, setCanExpand] = useState(false);
  const [measured, setMeasured] = useState(false);

  useEffect(() => {
    setExpanded(false);
    setCanExpand(false);
    setMeasured(false);
  }, [collapsedLines, text]);

  return (
    <View style={containerStyle}>
      {!measured ? (
        <View
          pointerEvents="none"
          style={{
            position: 'absolute',
            left: 0,
            right: 0,
            opacity: 0,
            zIndex: -1,
          }}
        >
          <AppText
            preset="body"
            style={textStyle}
            onTextLayout={event => {
              if (measured) return;
              setCanExpand(event.nativeEvent.lines.length > collapsedLines);
              setMeasured(true);
            }}
          >
            {text}
          </AppText>
        </View>
      ) : null}
      <AppText
        preset="body"
        style={textStyle}
        numberOfLines={expanded ? undefined : collapsedLines}
      >
        {text}
      </AppText>
      {canExpand ? (
        <TouchableOpacity
          activeOpacity={0.85}
          onPress={() => {
            setExpanded(current => !current);
          }}
        >
          <AppText
            preset="caption"
            style={[
              {
                marginTop: 6,
                color: '#2F6FDB',
                fontWeight: '900',
              },
              toggleTextStyle,
            ]}
          >
            {expanded ? '접기' : '더보기'}
          </AppText>
        </TouchableOpacity>
      ) : null}
    </View>
  );
}
