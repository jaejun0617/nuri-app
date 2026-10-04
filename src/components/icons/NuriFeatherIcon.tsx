import React, { memo } from 'react';
import NuriSemanticIcon, { type NuriAppIconProps } from './NuriSemanticIcon';

function NuriFeatherIcon(props: NuriAppIconProps) {
  return <NuriSemanticIcon family="feather" {...props} />;
}

export default memo(NuriFeatherIcon);
