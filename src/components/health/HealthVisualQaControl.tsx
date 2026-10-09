import React from 'react';
import { Pressable } from 'react-native';
import AppText from '../../app/ui/AppText';
import { useHealthVisualQaStore } from './healthVisualQa';

export default function HealthVisualQaControl() {
  const enabled = useHealthVisualQaStore(state => state.enabled);
  const setEnabled = useHealthVisualQaStore(state => state.setEnabled);
  if (!__DEV__) return null;
  return (
    <Pressable
      accessibilityRole="switch"
      accessibilityLabel="건강관리 QA 샘플 표시"
      accessibilityState={{ checked: enabled }}
      onPress={() => setEnabled(!enabled)}
      style={{ minHeight: 48, justifyContent: 'center', paddingHorizontal: 4 }}
    >
      <AppText preset="caption" color="#475569">
        {enabled ? 'QA 샘플 · 실제로 전환' : 'QA 샘플 보기'}
      </AppText>
    </Pressable>
  );
}
