import React from 'react';
import { Pressable, TextInput, View } from 'react-native';
import Feather from 'react-native-vector-icons/Feather';

import AppText from '../../app/ui/AppText';
import { styles } from './LocationDiscovery.styles';

type Props = {
  value: string;
  placeholder: string;
  helperText?: string | null;
  loadingText?: string | null;
  accentColor?: string;
  loadingColor?: string;
  onChangeText: (value: string) => void;
  onSubmit: () => void;
  onOpenFilters?: () => void;
};

export default function LocationDiscoverySearchBar({
  value,
  placeholder,
  helperText,
  loadingText,
  accentColor = '#2F8F48',
  loadingColor = '#6D6AF8',
  onChangeText,
  onSubmit,
  onOpenFilters,
}: Props) {
  return (
    <View style={styles.searchWrap}>
      <View style={styles.searchInputWrap}>
        <Feather name="search" size={18} color="#98A1B2" />
        <TextInput
          value={value}
          onChangeText={onChangeText}
          onSubmitEditing={onSubmit}
          placeholder={placeholder}
          placeholderTextColor="#98A1B2"
          style={styles.searchInput}
          autoCapitalize="none"
          autoCorrect={false}
          blurOnSubmit={false}
          returnKeyType="search"
        />
        {value ? (
          <Pressable onPress={() => onChangeText('')}>
            <Feather name="x" size={16} color="#98A1B2" />
          </Pressable>
        ) : null}
        {onOpenFilters ? (
          <Pressable onPress={onOpenFilters}>
            <Feather name="sliders" size={18} color="#7D87A0" />
          </Pressable>
        ) : null}
        <Pressable onPress={onSubmit} hitSlop={10}>
          <Feather name="arrow-right-circle" size={18} color={accentColor} />
        </Pressable>
      </View>
      <View style={styles.searchMetaRow}>
        {helperText ? (
          <AppText preset="caption" style={styles.searchHelperText}>
            {helperText}
          </AppText>
        ) : (
          <View />
        )}
        {loadingText ? (
          <AppText
            preset="caption"
            style={[styles.searchLoadingText, { color: loadingColor }]}
          >
            {loadingText}
          </AppText>
        ) : null}
      </View>
    </View>
  );
}
