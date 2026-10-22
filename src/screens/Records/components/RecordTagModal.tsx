import React, { useCallback } from 'react';
import { Keyboard, Modal, ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import { KeyboardAvoidingView } from 'react-native-keyboard-controller';
import Animated from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AppText from '../../../app/ui/AppText';
import AppTextInput from '../../../app/ui/AppTextInput';
import NuriSemanticIcon from '../../../components/icons/NuriSemanticIcon';
import { LavenderScreenBackground } from '../../../components/common/LavenderScreenBackground';
import { RecordFieldGlass } from '../../../components/records/TimelineFormSurface';
import TimelineButton, { CtaText } from '../../../components/records/TimelineButton';
import { useKeyboardBottomPadding } from '../../../hooks/useKeyboardBottomPadding';
import { TIMELINE_DESIGN as C } from '../../../theme/timelineDesign';
import { LAVENDER_CANVAS } from '../../../theme/lavenderCanvas';

type Props = {
  visible: boolean;
  tagDraft: string;
  selectedTags: string[];
  onClose: () => void;
  onChangeTagDraft: (value: string) => void;
  onSubmitDraftTag: () => void;
  onRemoveTag: (tag: string) => void;
  embedded?: boolean;
};

/** The parent retains tag/draft policy; this sheet only presents existing actions. */
export default function RecordTagModal({
  visible,
  tagDraft,
  selectedTags,
  onClose,
  onChangeTagDraft,
  onSubmitDraftTag,
  onRemoveTag,
  embedded = false,
}: Props) {
  const insets = useSafeAreaInsets();
  const bottomPaddingStyle = useKeyboardBottomPadding(Math.max(insets.bottom, 18) + 6);
  const canAdd = tagDraft.trim().length > 0;
  const close = useCallback(() => {
    Keyboard.dismiss();
    onClose();
  }, [onClose]);
  const requestClose = useCallback(() => {
    if (Keyboard.isVisible()) {
      Keyboard.dismiss();
      return;
    }
    close();
  }, [close]);
  const addTag = useCallback(() => {
    if (canAdd) onSubmitDraftTag();
  }, [canAdd, onSubmitDraftTag]);

  if (!visible) return null;
  const content = (
    <KeyboardAvoidingView
      testID="record-tag-sheet-root"
      style={[s.root, { paddingTop: insets.top + 12 }, embedded && s.embedded]}
      behavior="height"
      automaticOffset
      enabled
    >
      <TouchableOpacity
        accessibilityRole="button"
        accessibilityLabel="태그 추가 닫기"
        testID="record-tag-sheet-backdrop"
        activeOpacity={1}
        style={StyleSheet.absoluteFill}
        onPress={close}
      />
      <Animated.View
        testID="record-tag-sheet"
        style={[s.sheet, bottomPaddingStyle]}
        accessibilityViewIsModal
        importantForAccessibility="yes"
      >
        <LavenderScreenBackground statusBarInset={0} testID="record-tag-sheet-background" />
        <View style={s.handle} pointerEvents="none" accessible={false} />
        <View style={s.header}>
          <AppText preset="unifiedTitle" accessibilityRole="header" style={s.title}>태그 추가</AppText>
          <TouchableOpacity accessibilityRole="button" accessibilityLabel="태그 창 닫기"
            testID="record-tag-sheet-close" onPress={close} style={s.iconButton}>
            <NuriSemanticIcon family="feather" name="x" preserveOriginal size={22} color={C.ink} accessible={false} />
          </TouchableOpacity>
        </View>
        <ScrollView
          testID="record-tag-sheet-scroll"
          style={s.scroll}
          contentContainerStyle={s.content}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="none"
          showsVerticalScrollIndicator={false}
        >
          <View style={s.inputRow}>
            <RecordFieldGlass borderRadius={12} />
            <NuriSemanticIcon family="feather" name="hash" preserveOriginal size={18} color={C.muted} accessible={false} />
            <AppTextInput
              testID="record-tag-sheet-input"
              accessibilityLabel="추가할 태그"
              style={s.input}
              value={tagDraft}
              onChangeText={onChangeTagDraft}
              placeholder="태그 입력"
              placeholderTextColor={C.muted}
              autoCapitalize="none"
              autoCorrect={false}
              autoFocus={false}
              returnKeyType="done"
              onSubmitEditing={addTag}
            />
            <TouchableOpacity accessibilityRole="button" accessibilityLabel="입력한 태그 추가"
              accessibilityState={{ disabled: !canAdd }} testID="record-tag-sheet-add"
              disabled={!canAdd} onPress={addTag} style={[s.iconButton, !canAdd && s.disabled]}>
              <NuriSemanticIcon family="feather" name="plus" preserveOriginal size={22} color={C.ink} accessible={false} />
            </TouchableOpacity>
          </View>
          {selectedTags.length > 0 ? (
            <>
              <View style={s.sectionHeader}>
                <AppText preset="unifiedLabel" color={C.ink}>선택된 태그</AppText>
                <AppText preset="unifiedMeta" color={C.muted}>{selectedTags.length}개</AppText>
              </View>
              <View style={s.tags}>
                {selectedTags.map(tag => (
                  <TouchableOpacity key={tag} accessibilityRole="button"
                    accessibilityLabel={`${tag} 태그 제거`} onPress={() => onRemoveTag(tag)} style={s.tag}>
                    <AppText preset="unifiedMeta" color={C.primary} style={s.tagText}>{tag}</AppText>
                    <NuriSemanticIcon family="feather" name="x" preserveOriginal size={14} color={C.primary} accessible={false} />
                  </TouchableOpacity>
                ))}
              </View>
            </>
          ) : null}
        </ScrollView>
        <View style={s.footer}>
          <TimelineButton role="primary" accessibilityLabel="태그 선택 완료"
            testID="record-tag-sheet-done" onPress={close}>
            <CtaText preset="unifiedLabel">완료</CtaText>
          </TimelineButton>
        </View>
      </Animated.View>
    </KeyboardAvoidingView>
  );
  if (embedded) return content;
  return (
    <Modal visible transparent statusBarTranslucent navigationBarTranslucent
      animationType="slide" onRequestClose={requestClose}>
      {content}
    </Modal>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, justifyContent: 'flex-end', backgroundColor: C.overlay },
  embedded: { ...StyleSheet.absoluteFill, zIndex: 10 },
  sheet: {
    width: '100%', maxHeight: '100%', flexShrink: 1, minHeight: 0,
    backgroundColor: LAVENDER_CANVAS.base,
    borderTopLeftRadius: 24, borderTopRightRadius: 24, overflow: 'hidden',
  },
  handle: { alignSelf: 'center', width: 44, height: 4, borderRadius: 2, backgroundColor: '#C9C2DA', marginTop: 10 },
  header: { flexDirection: 'row', alignItems: 'center', paddingLeft: 20, paddingRight: 12, paddingVertical: 8 },
  title: { flex: 1, color: C.ink },
  iconButton: { minWidth: 48, minHeight: 48, alignItems: 'center', justifyContent: 'center' },
  scroll: { flexGrow: 0, flexShrink: 1, minHeight: 0 },
  content: { paddingHorizontal: 20, paddingBottom: 12 },
  inputRow: { minHeight: 52, borderRadius: 12, flexDirection: 'row', alignItems: 'center', paddingLeft: 14, paddingRight: 4, gap: 8 },
  input: { flex: 1, minWidth: 0, minHeight: 48, color: C.ink, backgroundColor: 'transparent', paddingVertical: 12 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 20, marginBottom: 8 },
  tags: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  tag: { minHeight: 48, maxWidth: '100%', borderRadius: 16, paddingHorizontal: 14, paddingVertical: 10, backgroundColor: C.selected, flexDirection: 'row', alignItems: 'center', gap: 8 },
  tagText: { flexShrink: 1 },
  footer: { paddingHorizontal: 20, paddingTop: 8 },
  disabled: { opacity: 0.35 },
});
