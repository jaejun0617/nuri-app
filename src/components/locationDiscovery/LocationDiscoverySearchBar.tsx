import AppTextInput from '../../app/ui/AppTextInput';
import React from 'react';
import { Pressable, View } from 'react-native';
import Feather from '../icons/NuriFeatherIcon';

import AppText from '../../app/ui/AppText';
import { styles } from './LocationDiscovery.styles';
import { MenuGlassSurface, MENU_GLASS_FRAME } from '../common/MenuGlassSurface';

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
  surfaceVariant?: 'plain' | 'menuGlass';
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
  surfaceVariant = 'plain',
}: Props) {
  const showMetaRow = Boolean(helperText || loadingText);

  return (
    <View style={styles.searchWrap}>
      <View style={[styles.searchInputWrap, surfaceVariant === 'menuGlass' && MENU_GLASS_FRAME]}>
        {surfaceVariant === 'menuGlass' ? <MenuGlassSurface radius={16} /> : null}
        <Feather name="search" size={18} color="#98A1B2" />
        <AppTextInput
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
      {showMetaRow ? (
        <View style={styles.searchMetaRow}>
          {helperText ? (
            <AppText preset="unifiedMeta" style={styles.searchHelperText}>
              {helperText}
            </AppText>
          ) : (
            <View />
          )}
          {loadingText ? (
            <AppText
              preset="unifiedMeta"
              style={[styles.searchLoadingText, { color: loadingColor }]}
            >
              {loadingText}
            </AppText>
          ) : null}
        </View>
      ) : null}
    </View>
  );
}
