import React, { memo } from 'react';
import Feather from 'react-native-vector-icons/Feather';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import type { IconProps } from 'react-native-vector-icons/Icon';

import NuriIcon, { type NuriIconName, type NuriIconVariant } from './NuriIcon';
import { resolveNuriIcon } from './nuriIconNames';

export type NuriAppIconProps = Pick<
  IconProps,
  | 'name'
  | 'size'
  | 'color'
  | 'style'
  | 'testID'
  | 'accessible'
  | 'accessibilityElementsHidden'
>;

type Props = NuriAppIconProps & {
  family: 'feather' | 'material';
  semantic?: NuriIconName;
  variant?: NuriIconVariant;
  preserveOriginal?: boolean;
};

/** App-owned glyphs use their source colors; arrows and official brands stay native. */
function NuriSemanticIconBase({
  family,
  name,
  semantic,
  preserveOriginal,
  variant: _variant,
  ...props
}: Props) {
  const nuriName = preserveOriginal
    ? undefined
    : semantic ?? resolveNuriIcon(family, name);
  if (nuriName)
    return (
      <NuriIcon
        name={nuriName}
        size={props.size ?? 12}
        style={props.style}
        testID={props.testID}
      />
    );
  const Icon = family === 'material' ? MaterialCommunityIcons : Feather;
  return <Icon name={name} {...props} />;
}

export default memo(NuriSemanticIconBase);
