import React from 'react';
import { Pressable, TextInput, View } from 'react-native';
import Feather from 'react-native-vector-icons/Feather';

import AppText from '../../app/ui/AppText';
import { styles } from './LocationDiscovery.styles';

type Props = {
  value: string;
  placeholder: string;
  helperText: string;
  loadingText?: string | null;
  onChangeText: (value: string) => void;
  onOpenFilters?: () => void;
};

export default function LocationDiscoverySearchBar({
  value,
  placeholder,
  helperText,
  loadingText,
  onChangeText,
  onOpenFilters,
}: Props) {
  return (
    <View style={styles.searchWrap}>
      <View style={styles.searchInputWrap}>
        <Feather name="search" size={18} color="#98A1B2" />
        <TextInput
          value={value}
          onChangeText={onChangeText}
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
      </View>
      <View style={styles.searchMetaRow}>
        <AppText preset="caption" style={styles.searchHelperText}>
          {helperText}
        </AppText>
        {loadingText ? (
          <AppText preset="caption" style={styles.searchLoadingText}>
            {loadingText}
          </AppText>
        ) : null}
      </View>
    </View>
  );
}
