import React from 'react';
import NuriSemanticIcon from '../icons/NuriSemanticIcon';
import type { RecordMainCategoryKey, RecordOtherSubCategoryKey } from '../../services/records/form';

type CategoryKey = RecordMainCategoryKey | RecordOtherSubCategoryKey;
const ICONS: Record<CategoryKey, string> = {
  walk: 'shoe-print',
  meal: 'silverware-fork-knife',
  diary: 'notebook-outline',
  other: 'home-outline',
  health: 'heart-outline',
  grooming: 'content-cut',
  indoor: 'controller-classic-outline',
  training: 'school-outline',
  outing: 'bag-suitcase-outline',
  shopping: 'shopping-outline',
  bathing: 'bathtub-outline',
  etc: 'dots-horizontal',
  hospital: 'hospital-building',
};

/** Create/edit share the same line glyphs without changing their stored categories. */
export function renderRecordCategoryIcon(key: CategoryKey) {
  return <NuriSemanticIcon testID={`record-category-icon-${key}`}
    family="material" name={ICONS[key]} preserveOriginal
    size={24} color="#000000" accessible={false} />;
}
