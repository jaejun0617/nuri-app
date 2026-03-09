import React, { memo } from 'react';
import {
  Image,
  Text,
  TouchableOpacity,
  View,
  type ImageStyle,
  type StyleProp,
  type TextStyle,
  type ViewStyle,
} from 'react-native';
import Feather from 'react-native-vector-icons/Feather';

type PhotoAddCardProps = {
  imageUri: string | null;
  onPress: () => void;
  containerStyle?: StyleProp<ViewStyle>;
  imageStyle?: StyleProp<ImageStyle>;
  placeholderStyle?: StyleProp<ViewStyle>;
  placeholderIconName?: string;
  placeholderIconColor?: string;
  placeholderIconSize?: number;
  placeholderText?: string;
  placeholderTextStyle?: StyleProp<TextStyle>;
  editButtonStyle?: StyleProp<ViewStyle>;
  editIconName?: string;
  editIconSize?: number;
  editIconColor?: string;
  overlayContent?: React.ReactNode;
};

function PhotoAddCardComponent({
  imageUri,
  onPress,
  containerStyle,
  imageStyle,
  placeholderStyle,
  placeholderIconName = 'camera',
  placeholderIconColor = '#8B5CF6',
  placeholderIconSize = 20,
  placeholderText,
  placeholderTextStyle,
  editButtonStyle,
  editIconName = 'edit-3',
  editIconSize = 14,
  editIconColor = '#FFFFFF',
  overlayContent,
}: PhotoAddCardProps) {
  return (
    <TouchableOpacity activeOpacity={0.92} style={containerStyle} onPress={onPress}>
      {imageUri ? (
        <Image source={{ uri: imageUri }} style={imageStyle} />
      ) : (
        <View style={placeholderStyle}>
          <Feather
            color={placeholderIconColor}
            name={placeholderIconName}
            size={placeholderIconSize}
          />
          {placeholderText ? (
            <Text style={placeholderTextStyle}>{placeholderText}</Text>
          ) : null}
        </View>
      )}

      {overlayContent}

      <View style={editButtonStyle}>
        <Feather color={editIconColor} name={editIconName} size={editIconSize} />
      </View>
    </TouchableOpacity>
  );
}

const PhotoAddCard = memo(PhotoAddCardComponent);

export default PhotoAddCard;
