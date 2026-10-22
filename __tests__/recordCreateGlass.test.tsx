import React from 'react';
import { Image, Pressable, StyleSheet, Text, TextInput, TouchableOpacity } from 'react-native';
import TestRenderer, { act } from 'react-test-renderer';
import { ThemeProvider } from 'styled-components/native';
import { createTheme } from '../src/app/theme/theme';
import { HomeReflectiveGlass } from '../src/components/home/HomeReflectiveGlass';
import {
  HOME_FLOATING_WIDGET_MATERIAL,
  HOME_FLOATING_WIDGET_REFLECTION,
  HOME_FLOATING_WIDGET_GLINT,
} from '../src/components/home/HomeWidgetMaterial';
import RecordChoiceGrid from '../src/components/records/RecordChoiceGrid';
import RecordCareFields from '../src/components/records/RecordCareFields';
import MedicalRecordFields from '../src/components/records/MedicalRecordFields';
import RecordPhotoStrip from '../src/components/records/RecordPhotoStrip';
import { RecordFieldGlass, SeasonalFormPanel } from '../src/components/records/TimelineFormSurface';
import { LAVENDER_CANVAS } from '../src/theme/lavenderCanvas';
import { TIMELINE_DESIGN } from '../src/theme/timelineDesign';
import { emptyHealthCareDetails, getRecordCareOptions } from '../src/services/records/metadata';
import { createMemory } from '../src/services/supabase/memories';
import RecordCreateScreen from '../src/screens/Records/RecordCreateScreen';
import { styles } from '../src/screens/Records/RecordCreateScreen.styles';
import { usePetStore } from '../src/store/petStore';
import type { RootStackParamList } from '../src/navigation/RootNavigator';

let mockParams: RootStackParamList['RecordCreate'] = { petId: 'glass-qa', initialMainCategory: 'walk' };
const mockNavigation = { canGoBack: () => true, goBack: jest.fn(), navigate: jest.fn() };
jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => mockNavigation,
  useRoute: () => ({ params: mockParams }),
  useFocusEffect: (callback: () => void | (() => void)) => {
    const runtime = jest.requireActual('react') as typeof React;
    runtime.useEffect(callback, [callback]);
  },
}));
jest.mock('@tanstack/react-query', () => ({
  ...jest.requireActual('@tanstack/react-query'),
  useQueryClient: () => ({ invalidateQueries: jest.fn() }),
}));
jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 24, bottom: 18, left: 0, right: 0 }),
}));
jest.mock('react-native-keyboard-controller', () => {
  const runtime = jest.requireActual('react') as typeof React;
  return {
    useKeyboardState: (select: (state: { isVisible: boolean }) => unknown) => select({ isVisible: false }),
    KeyboardAwareScrollView: runtime.forwardRef((
      { children, ...props }: React.PropsWithChildren<Record<string, unknown>>,
      ref: React.ForwardedRef<unknown>,
    ) => {
      runtime.useImperativeHandle(ref, () => ({ scrollTo: jest.fn(), assureFocusedInputVisible: jest.fn() }));
      return runtime.createElement('KeyboardControllerScrollView', props, children);
    }),
  };
});
jest.mock('../src/components/date-picker/DatePickerModal', () => () => null);
jest.mock('../src/components/common/PremiumRewardModal', () => () => null);
jest.mock('../src/components/common/ConfirmDialog', () => () => null);
jest.mock('../src/screens/Records/components/RecordTagModal', () => () => null);
jest.mock('../src/services/local/recordDraft', () => ({
  clearRecordCreateDraft: jest.fn().mockResolvedValue(undefined),
  loadRecordCreateDraft: jest.fn().mockResolvedValue(null),
  saveRecordCreateDraft: jest.fn().mockResolvedValue(undefined),
}));
jest.mock('../src/services/supabase/memories', () => ({
  ...jest.requireActual('../src/services/supabase/memories'),
  createMemory: jest.fn(),
}));

const mounted: TestRenderer.ReactTestRenderer[] = [];
function render(element: React.ReactElement, dark = false) {
  let tree: TestRenderer.ReactTestRenderer | undefined;
  act(() => { tree = TestRenderer.create(<ThemeProvider theme={createTheme(dark ? 'dark' : 'light')}>{element}</ThemeProvider>); });
  if (!tree) throw new Error('Test component did not mount');
  mounted.push(tree);
  return tree;
}
function byId(tree: TestRenderer.ReactTestRenderer, id: string) {
  const node = tree.root.findAllByProps({ testID: id }).at(-1);
  if (!node) throw new Error(`Missing paint layer: ${id}`);
  return node;
}
afterEach(() => {
  act(() => mounted.splice(0).forEach(tree => tree.unmount()));
  jest.clearAllMocks();
});

describe('Create opt-in Home glass surfaces', () => {
  it.each([false, true])('reuses actual Home fill/reflections without owning touch or padded layout (dark=%s)', dark => {
    const tree = render(<RecordFieldGlass selected borderRadius={14} />, dark);
    const frame = byId(tree, 'record-field-glass');
    expect(StyleSheet.flatten(frame.props.style)).toMatchObject({
      position: 'absolute', top: 0, right: 0, bottom: 0, left: 0,
      width: 'auto', marginTop: 0, borderRadius: 14,
    });
    expect(frame.props.pointerEvents).toBe('box-none');
    expect(StyleSheet.flatten(byId(tree, 'home-reflective-fill').props.style)).toMatchObject(HOME_FLOATING_WIDGET_MATERIAL);
    expect(byId(tree, 'home-reflective-glass-reflection').props.colors).toEqual(HOME_FLOATING_WIDGET_REFLECTION.colors);
    expect(byId(tree, 'home-reflective-glass-glint').props.colors).toEqual(HOME_FLOATING_WIDGET_GLINT.colors);
    expect(byId(tree, 'home-reflective-glass-reflection').props.pointerEvents).toBe('none');
    const selection = byId(tree, 'record-field-glass-selection');
    expect(selection.props.pointerEvents).toBe('none');
    expect(StyleSheet.flatten(selection.props.style)).toMatchObject({ borderColor: TIMELINE_DESIGN.primary, borderWidth: 1 });
  });

  it('keeps plain shared tiles and medical inputs unchanged by default', () => {
    const tree = render(<>
      <RecordChoiceGrid options={[{ key: 'walk', label: '산책' }]} selected={[]} onSelect={jest.fn()} />
      <RecordCareFields category="bathing" selected={[]} onChange={jest.fn()} />
      <MedicalRecordFields value={emptyHealthCareDetails()} onChange={jest.fn()} />
      <RecordPhotoStrip items={[]} onAdd={jest.fn()} onRemove={jest.fn()} />
    </>);
    expect(tree.root.findAllByType(RecordFieldGlass)).toHaveLength(0);
    expect(tree.root.findAllByType(HomeReflectiveGlass)).toHaveLength(0);
    expect(tree.root.findAllByType(TextInput)).toHaveLength(3);
    for (const input of tree.root.findAllByType(TextInput)) {
      expect(StyleSheet.flatten(input.props.style).backgroundColor).toBe('rgba(255,255,255,0.7)');
    }
    expect(tree.root.findAllByType(RecordChoiceGrid).every(node => node.props.surfaceVariant !== 'homeGlass')).toBe(true);
  });

  it('keeps tile keys, selected/disabled state and 48dp targets with glass', () => {
    const select = jest.fn();
    const tree = render(<RecordChoiceGrid surfaceVariant="homeGlass" options={[{ key: 'walk', label: '산책' }, { key: 'meal', label: '식사' }]} selected={['walk']} onSelect={select} />);
    const targets = tree.root.findAllByType(TouchableOpacity);
    expect(targets[0].props.accessibilityState).toEqual({ selected: true, disabled: false });
    expect(StyleSheet.flatten(targets[0].props.style).minHeight).toBe(48);
    expect(tree.root.findAllByType(RecordFieldGlass).map(node => node.props.selected)).toEqual([true, false]);
    act(() => targets[1].props.onPress());
    expect(select).toHaveBeenCalledWith('meal');
    act(() => tree.update(<ThemeProvider theme={createTheme('light')}><RecordChoiceGrid surfaceVariant="homeGlass" disabled options={[{ key: 'walk', label: '산책' }]} selected={['walk']} onSelect={select} /></ThemeProvider>));
    const disabled = tree.root.findByType(TouchableOpacity);
    expect(disabled.props.disabled).toBe(true);
    expect(StyleSheet.flatten(disabled.props.style).opacity).toBe(0.5);
  });

  it('forwards care opt-in while retaining actual multi-select metadata values', () => {
    const options = getRecordCareOptions('bathing');
    const first = options[0].value;
    const second = options[1].value;
    const change = jest.fn();
    const tree = render(<RecordCareFields surfaceVariant="homeGlass" category="bathing" selected={[first]} onChange={change} />);
    expect(tree.root.findByType(RecordChoiceGrid).props.surfaceVariant).toBe('homeGlass');
    const targets = tree.root.findAllByType(TouchableOpacity);
    act(() => targets[1].props.onPress());
    expect(change).toHaveBeenLastCalledWith([first, second]);
    act(() => targets[0].props.onPress());
    expect(change).toHaveBeenLastCalledWith([]);
    const check = byId(tree, 'record-care-check');
    expect(check.props).toMatchObject({ name: 'check', size: 11, color: '#FFFFFF' });
    expect(StyleSheet.flatten(check.props.style)).toMatchObject({ lineHeight: 12, includeFontPadding: false });
    const ring = check.parent;
    expect(ring).not.toBeNull();
    const rings = tree.root.findAll(node => {
      const style = StyleSheet.flatten(node.props.style);
      return style?.width === 16 && style?.height === 16 && style?.overflow === 'hidden';
    });
    expect(rings.length).toBeGreaterThan(0);
  });

  it('preserves medical value, focus callback, keyboard input and disabled contract', () => {
    const change = jest.fn();
    const focus = jest.fn();
    const value = { ...emptyHealthCareDetails('hospital'), hospitalName: '시험 병원' };
    const tree = render(<MedicalRecordFields surfaceVariant="homeGlass" value={value} onChange={change} onFocus={focus} />);
    expect(tree.root.findAllByType(RecordFieldGlass)).toHaveLength(6);
    const input = tree.root.findAllByType(TextInput).find(node => node.props.accessibilityLabel === '병원명');
    if (!input) throw new Error('Medical input missing');
    expect(input.props.value).toBe(value.hospitalName);
    expect(StyleSheet.flatten(input.props.style)).toMatchObject({ minHeight: 48, backgroundColor: 'transparent' });
    act(() => input.props.onFocus());
    expect(focus).toHaveBeenCalledTimes(1);
    act(() => input.props.onChangeText('다른 병원'));
    expect(change).toHaveBeenCalledWith({ ...value, hospitalName: '다른 병원' });
    act(() => tree.update(<ThemeProvider theme={createTheme('light')}><MedicalRecordFields surfaceVariant="homeGlass" value={value} onChange={change} disabled /></ThemeProvider>));
    expect(tree.root.findAllByType(TextInput).every(node => node.props.editable === false)).toBe(true);
    expect(tree.root.findAllByType(Pressable).every(node => node.props.disabled)).toBe(true);
  });

  it('preserves photo positions, decode, indices and add/remove touch targets', () => {
    const remove = jest.fn();
    const add = jest.fn();
    const tree = render(<RecordPhotoStrip surfaceVariant="homeGlass" items={[{ key: 'pending', uri: null }, { key: 'local', uri: 'file:///test-only.jpg' }]} onAdd={add} onRemove={remove} />);
    expect(tree.root.findAllByType(RecordFieldGlass)).toHaveLength(3);
    expect(tree.root.findByType(Image).props).toMatchObject({ source: { uri: 'file:///test-only.jpg' }, resizeMethod: 'resize' });
    const targets = tree.root.findAllByType(TouchableOpacity);
    const second = targets.find(node => node.props.accessibilityLabel === '사진 2 제거');
    const addTarget = targets.find(node => node.props.accessibilityLabel === '사진 추가');
    if (!second || !addTarget) throw new Error('Photo targets missing');
    expect(StyleSheet.flatten(second.props.style)).toMatchObject({ minWidth: 48, minHeight: 48 });
    expect(StyleSheet.flatten(addTarget.props.style)).toMatchObject({ width: 88, height: 88, backgroundColor: 'transparent' });
    expect(byId(tree, 'record-photo-add-icon').props).toMatchObject({ name: 'plus', color: '#000000' });
    act(() => second.props.onPress());
    act(() => addTarget.props.onPress());
    expect(remove).toHaveBeenCalledWith(1);
    expect(add).toHaveBeenCalledTimes(1);
  });

  it.each(['walk', 'bathing', 'health', 'meal'] as const)('opts in only the actual Create %s fields without nesting the full form in glass', async category => {
    const original = usePetStore.getState();
    usePetStore.setState({ pets: [{ id: 'glass-qa', name: 'QA' }], selectedPetId: 'glass-qa' });
    mockParams = category === 'bathing'
      ? { petId: 'glass-qa', initialMainCategory: 'other', initialOtherSubCategory: 'bathing' }
      : { petId: 'glass-qa', initialMainCategory: category };
    let tree: TestRenderer.ReactTestRenderer | undefined;
    try {
      await act(async () => { tree = render(<RecordCreateScreen />); });
      if (!tree) throw new Error('Create screen missing');
      const panel = tree.root.findByType(SeasonalFormPanel);
      expect(StyleSheet.flatten(panel.props.style)).toEqual({ padding: 0 });
      expect(byId(tree, 'timeline-form-background').props.colors).toEqual(LAVENDER_CANVAS.colors);
      expect(StyleSheet.flatten(styles.screen)).toMatchObject({ backgroundColor: LAVENDER_CANVAS.base });
      for (const grid of tree.root.findAllByType(RecordChoiceGrid)) expect(grid.props.surfaceVariant).toBe('homeGlass');
      expect(tree.root.findByType(RecordPhotoStrip).props.surfaceVariant).toBe('homeGlass');
      expect(tree.root.findAllByType(RecordFieldGlass).length).toBeGreaterThan(8);
      expect(StyleSheet.flatten(styles.input)).toMatchObject({ minHeight: 48, backgroundColor: 'transparent' });
      expect(StyleSheet.flatten(styles.dateCard)).toMatchObject({ minHeight: 48, backgroundColor: 'transparent' });
      expect(StyleSheet.flatten(styles.tagSelector)).toMatchObject({ minHeight: 48 });
      expect(byId(tree, 'record-category-icon-walk').props).toMatchObject({ name: 'shoe-print', color: '#000000' });
      for (const key of ['meal', 'diary', 'other']) {
        expect(byId(tree, `record-category-icon-${key}`).props).toMatchObject({ size: 24, color: '#000000' });
      }
      expect(byId(tree, 'record-date-chevron').props).toMatchObject({ name: 'chevron-right', color: '#000000' });
      if (category === 'bathing') {
        const expected = { grooming: 'content-cut', indoor: 'controller-classic-outline', training: 'school-outline', outing: 'bag-suitcase-outline', shopping: 'shopping-outline', bathing: 'bathtub-outline', etc: 'dots-horizontal' };
        for (const [key, name] of Object.entries(expected)) {
          expect(byId(tree, `record-category-icon-${key}`).props).toMatchObject({ name, color: '#000000' });
        }
      }
      if (category === 'meal') {
        const amount = tree.root.findAllByType(TextInput).find(node => node.props.testID === 'record-create-meal-amount');
        if (!amount) throw new Error('Meal amount input missing');
        expect(amount.props).toMatchObject({ placeholder: '예: 180g', keyboardType: 'number-pad', accessibilityLabel: '급여량 (g)' });
        expect(tree.root.findAllByType(Text).some(node => node.props.children === 'g')).toBe(false);
        act(() => amount.props.onChangeText('180'));
        expect(amount.props.value).toBe('180');
      }
      expect(createMemory).not.toHaveBeenCalled();
    } finally {
      act(() => tree?.unmount());
      if (tree) mounted.splice(mounted.indexOf(tree), 1);
      usePetStore.setState(original, true);
    }
  });
});
