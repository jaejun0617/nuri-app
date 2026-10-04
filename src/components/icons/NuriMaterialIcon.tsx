import React, { memo } from 'react';
import NuriSemanticIcon, { type NuriAppIconProps } from './NuriSemanticIcon';

function NuriMaterialIcon(props: NuriAppIconProps) {
  return <NuriSemanticIcon family="material" {...props} />;
}

export default memo(NuriMaterialIcon);
