import React from 'react';
import { Alert } from 'react-native';
import TestRenderer, { act } from 'react-test-renderer';
import { ThemeProvider } from 'styled-components/native';
import { QueryClientProvider } from '@tanstack/react-query';
import { appQueryClient } from '../src/services/query/appQueryClient';
import { createTheme } from '../src/app/theme/theme';
import RecordCreateScreen from '../src/screens/Records/RecordCreateScreen';
import RecordEditScreen from '../src/screens/Records/RecordEditScreen';
import RecordCareFields from '../src/components/records/RecordCareFields';
import RecordChoiceGrid from '../src/components/records/RecordChoiceGrid';
import HeaderTextActionButton from '../src/components/navigation/HeaderTextActionButton';
import { createMemory, updateMemoryFields, type MemoryRecord } from '../src/services/supabase/memories';
import { loadRecordCreateDraft, type RecordCreateDraft } from '../src/services/local/recordDraft';
import { filterRecordCareTypes, getRecordCareOptions, normalizeMemoryRecordMetadata } from '../src/services/records/metadata';
import { parseOptionalWonPrice } from '../src/services/records/form';
import { useRecordStore } from '../src/store/recordStore';
import { usePetStore } from '../src/store/petStore';

jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({ navigate: jest.fn(), goBack: jest.fn(), canGoBack: () => true, popTo: jest.fn() }),
  useRoute: () => ({ params: { petId: 'qa', memoryId: 'm', initialMainCategory: 'other', initialOtherSubCategory: 'grooming' } }),
  useFocusEffect: jest.fn(),
}));
jest.mock('../src/hooks/useGpsWalkComposer', () => ({ useGpsWalkComposer: () => ({ ready: false }) }));
jest.mock('../src/store/authStore', () => ({ useAuthStore: jest.requireActual('zustand').create(() => ({ session: { user: { id: 'u' } } })) }));
jest.mock('../src/services/supabase/memories', () => ({
  ...jest.requireActual('../src/services/supabase/memories'),
  createMemory: jest.fn().mockResolvedValue('new-memory'), updateMemoryFields: jest.fn().mockResolvedValue(undefined),
  fetchMemoryById: jest.fn().mockRejectedValue(new Error('offline refresh')),
}));
jest.mock('../src/services/activity/timelineActivity', () => ({
  recordTimelineCreateActivity: jest.fn().mockResolvedValue({ xp: null }),
  recordTimelineCategoryChangeActivity: jest.fn().mockResolvedValue({ xp: null }),
}));
jest.mock('../src/services/local/recordDraft', () => ({
  loadRecordCreateDraft: jest.fn(), clearRecordCreateDraft: jest.fn().mockResolvedValue(undefined), saveRecordCreateDraft: jest.fn().mockResolvedValue(undefined),
}));
jest.mock('../src/components/common/PremiumRewardModal', () => () => null);
jest.mock('../src/components/common/PremiumNoticeModal', () => () => null);
jest.mock('../src/components/common/ConfirmDialog', () => () => null);
jest.mock('../src/components/date-picker/DatePickerModal', () => () => null);
jest.mock('../src/components/records/RecordImageGallery', () => () => null);
jest.mock('../src/screens/Records/components/RecordTagModal', () => () => null);
jest.mock('../src/hooks/useKeyboardInset', () => ({ useKeyboardInset: () => 0 }));
jest.mock('react-native-safe-area-context', () => ({ SafeAreaView: jest.requireActual('react-native').View, useSafeAreaInsets: () => ({ top: 24, bottom: 18, left: 0, right: 0 }) }));
jest.mock('react-native-keyboard-controller', () => ({ KeyboardAwareScrollView: 'KeyboardScroll', useKeyboardState: () => false }));

describe('grooming and hygiene record compatibility', () => {
  let tree: TestRenderer.ReactTestRenderer;
  const petsBefore = usePetStore.getState();
  const recordsBefore = useRecordStore.getState();
  const legacy: MemoryRecord = { id: 'm', petId: 'qa', title: '기존 미용', tags: [], category: 'other', subCategory: 'grooming', price: 65000, occurredAt: '2026-10-18', createdAt: '2026-10-18T00:00:00Z', imagePaths: [], metadata: { version: 1, grooming: { careTypes: ['bath', 'nail_trim', 'ear_cleaning'] } } };
  const draftBase: RecordCreateDraft = { petId: 'qa', title: '', content: '', occurredAt: '2026-10-18', selectedTags: [], mainCategoryKey: 'other', otherSubCategoryKey: 'grooming', selectedEmotion: null, selectedImages: [], updatedAt: '2026-10-21T00:00:00Z' };
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(Alert, 'alert').mockImplementation(() => {});
    jest.mocked(loadRecordCreateDraft).mockResolvedValue(null);
    usePetStore.setState({ pets: [{ id: 'qa', name: '누리' }], selectedPetId: 'qa' });
    useRecordStore.setState({ byPetId: {}, refresh: jest.fn().mockResolvedValue(undefined) });
    useRecordStore.getState().upsertOneLocal('qa', legacy);
  });
  afterEach(async () => {
    await act(async () => tree?.unmount());
    appQueryClient.clear(); usePetStore.setState(petsBefore, true); useRecordStore.setState(recordsBefore, true);
    jest.restoreAllMocks();
  });
  async function mount(edit = false) {
    await act(async () => { tree = TestRenderer.create(<QueryClientProvider client={appQueryClient}><ThemeProvider theme={createTheme('light')}>{edit ? <RecordEditScreen /> : <RecordCreateScreen />}</ThemeProvider></QueryClientProvider>); });
  }
  async function submit() { await act(async () => tree.root.findByType(HeaderTextActionButton).props.onPress()); }
  it('maps stable category codes while legacy normalization preserves old cross-category choices', () => {
    expect(getRecordCareOptions('grooming').map(item => item.value)).toEqual(['full_grooming', 'partial_grooming', 'sanitary_trim', 'scissor_cut', 'clipper_cut', 'sporting_cut', 'face_trim', 'paw_pad_trim', 'nail_trim', 'coat_care']);
    expect(getRecordCareOptions('bathing').map(item => item.value)).toEqual(['bath', 'drying', 'brushing', 'conditioning', 'spa', 'mud_pack', 'tooth_brushing', 'ear_cleaning', 'anal_gland_care']);
    expect(filterRecordCareTypes('grooming', ['bath', 'full_grooming', 'coat_care'])).toEqual(['full_grooming', 'coat_care']);
    expect(normalizeMemoryRecordMetadata(legacy.metadata)).toEqual(legacy.metadata);
  });
  it('recognizes every salon service on read without admitting unknown or duplicate codes', () => {
    const codes = [...getRecordCareOptions('grooming'), ...getRecordCareOptions('bathing')].map(item => item.value);
    expect(normalizeMemoryRecordMetadata({ version: 1, grooming: { careTypes: [...codes, 'partial_grooming', 'unknown_service'] } }))
      .toEqual({ version: 1, grooming: { careTypes: codes } });
    expect(filterRecordCareTypes('bathing', ['partial_grooming', 'bath'])).toEqual(['bath']);
  });
  it.each([['', null], ['0', 0], ['20000', 20000]] as const)('saves shampoo alone with optional price %s under the latest PO expense policy', async (value, price) => {
    jest.mocked(loadRecordCreateDraft).mockResolvedValue({ ...draftBase, title: '샴푸만', otherSubCategoryKey: 'bathing', priceText: value, groomingCareTypes: ['bath'] });
    await mount();
    expect(tree.root.findByType(HeaderTextActionButton).props.disabled).toBe(false);
    await submit();
    expect(createMemory).toHaveBeenCalledTimes(1);
    expect(createMemory).toHaveBeenCalledWith(expect.objectContaining({ subCategory: 'bathing', price, metadata: { version: 1, grooming: { careTypes: ['bath'] } } }));
  });
  it.each(['-1', '1.5', 'abc', '1000000000'])('preserves an invalid bathing draft %s and blocks saving', async value => {
    jest.mocked(loadRecordCreateDraft).mockResolvedValue({ ...draftBase, title: '목욕', otherSubCategoryKey: 'bathing', priceText: value, groomingCareTypes: ['bath'] });
    await mount();
    expect(tree.root.findByProps({ testID: 'record-create-price' }).props.value).toBe(value);
    expect(tree.root.findByType(HeaderTextActionButton).props.disabled).toBe(true);
    await submit(); expect(createMemory).not.toHaveBeenCalled();
  });
  it.each(['grooming', 'bathing'] as const)('preserves the current optional price when %s is selected again', async category => {
    const careType = category === 'bathing' ? 'bath' : 'full_grooming';
    jest.mocked(loadRecordCreateDraft).mockResolvedValue({ ...draftBase, title: '관리 비용', otherSubCategoryKey: category, priceText: '25000', groomingCareTypes: [careType] });
    await mount();
    const grid = tree.root.findAllByType(RecordChoiceGrid).find(node => node.props.options.some((option: { key: string }) => option.key === 'bathing'))!;
    await act(async () => grid.props.onSelect(category));
    expect(tree.root.findByProps({ testID: 'record-create-price' }).props.value).toBe('25000');
    await submit();
    expect(createMemory).toHaveBeenCalledWith(expect.objectContaining({ subCategory: category, price: 25000 }));
  });
  it('preserves an expanded salon service and cost on an unchanged edit', async () => {
    const metadata = { version: 1 as const, grooming: { careTypes: ['scissor_cut' as const, 'spa' as const] } };
    useRecordStore.getState().upsertOneLocal('qa', { ...legacy, metadata, price: 30000 });
    await mount(true); await submit();
    expect(updateMemoryFields).toHaveBeenCalledWith(expect.objectContaining({ price: 30000, metadata }));
  });
  it.each(['-1', '1.5', 'abc', '1000000000', '1e3'])('rejects %s instead of silently converting it into a different price', value => {
    expect(() => parseOptionalWonPrice(value)).toThrow('정수');
  });
  it.each([['', null], ['0', 0], ['65000', 65000]] as const)('restores and saves optional price %s once for multiple grooming choices', async (value, price) => {
    jest.mocked(loadRecordCreateDraft).mockResolvedValue({ ...draftBase, title: '전체 미용·털 정리', priceText: value, groomingCareTypes: ['full_grooming', 'coat_care'] });
    await mount();
    expect(tree.root.findByProps({ testID: 'record-create-price' }).props.value).toBe(value);
    expect(tree.root.findByType(RecordCareFields).props.selected).toEqual(['full_grooming', 'coat_care']);
    await submit();
    expect(createMemory).toHaveBeenCalledTimes(1);
    expect(createMemory).toHaveBeenCalledWith(expect.objectContaining({ category: 'other', subCategory: 'grooming', price, metadata: { version: 1, grooming: { careTypes: ['full_grooming', 'coat_care'] } } }));
  });
  it.each(['-1', '1.5', 'abc', '1000000000'])('preserves invalid raw draft %s across hydration and blocks saving', async value => {
    jest.mocked(loadRecordCreateDraft).mockResolvedValue({ ...draftBase, title: '미용', priceText: value, groomingCareTypes: ['nail_trim'] });
    await mount();
    expect(tree.root.findByProps({ testID: 'record-create-price' }).props.value).toBe(value);
    expect(tree.root.findByType(HeaderTextActionButton).props.disabled).toBe(true);
    await submit(); expect(createMemory).not.toHaveBeenCalled();
  });
  it('clears old items and cost when switching to hygiene and back, and requires a current choice', async () => {
    jest.mocked(loadRecordCreateDraft).mockResolvedValue({ ...draftBase, title: '관리', priceText: '65000', groomingCareTypes: ['full_grooming', 'coat_care'] });
    await mount();
    const subGrid = () => tree.root.findAllByType(RecordChoiceGrid).find(node => node.props.options.some((option: { key: string }) => option.key === 'bathing'))!;
    await act(async () => subGrid().props.onSelect('bathing'));
    expect(tree.root.findByProps({ testID: 'record-create-price' }).props.value).toBe('');
    expect(tree.root.findByType(RecordCareFields).props.selected).toEqual([]);
    expect(tree.root.findByType(HeaderTextActionButton).props.disabled).toBe(true);
    await act(async () => tree.root.findByType(RecordCareFields).props.onChange(['bath', 'ear_cleaning']));
    await submit();
    expect(createMemory).toHaveBeenCalledWith(expect.objectContaining({ subCategory: 'bathing', price: null, metadata: { version: 1, grooming: { careTypes: ['bath', 'ear_cleaning'] } } }));
  });
  it('preserves every legacy care item and its price on an unchanged edit', async () => {
    await mount(true);
    expect(tree.root.findByType(RecordCareFields).props.legacy).toEqual(['bath', 'nail_trim', 'ear_cleaning']);
    await submit();
    expect(updateMemoryFields).toHaveBeenCalledWith(expect.objectContaining({ price: 65000, metadata: legacy.metadata }));
  });
  it('saves a changed price and month through the same canonical fields', async () => {
    await mount(true);
    await act(async () => tree.root.findByProps({ testID: 'record-edit-price' }).props.onChangeText('80000'));
    await submit();
    expect(updateMemoryFields).toHaveBeenCalledWith(expect.objectContaining({ price: 80000, occurredAt: '2026-10-18', metadata: legacy.metadata }));
  });
  it('applies new rules only after an explicit category change, not while editing legacy content', async () => {
    await mount(true);
    const grid = tree.root.findAllByType(RecordChoiceGrid).find(node => node.props.options.some((option: { key: string }) => option.key === 'bathing'))!;
    await act(async () => grid.props.onSelect('bathing'));
    expect(tree.root.findByType(RecordCareFields).props.selected).toEqual([]);
    expect(tree.root.findByType(HeaderTextActionButton).props.disabled).toBe(true);
    await act(async () => tree.root.findByType(RecordCareFields).props.onChange(['tooth_brushing']));
    await submit();
    expect(updateMemoryFields).toHaveBeenCalledWith(expect.objectContaining({ subCategory: 'bathing', price: null, metadata: { version: 1, grooming: { careTypes: ['tooth_brushing'] } } }));
  });
  it('does not erase an unchanged legacy hygiene price', async () => {
    useRecordStore.getState().upsertOneLocal('qa', { ...legacy, subCategory: 'bathing', price: 4300 });
    await mount(true); await submit();
    expect(updateMemoryFields).toHaveBeenCalledWith(expect.objectContaining({ subCategory: 'bathing', price: 4300, metadata: legacy.metadata }));
  });
  it('allows an explicit bathing price edit while preserving unchanged legacy care items', async () => {
    useRecordStore.getState().upsertOneLocal('qa', { ...legacy, subCategory: 'bathing', price: 4300 });
    await mount(true);
    await act(async () => tree.root.findByProps({ testID: 'record-edit-price' }).props.onChangeText('25000'));
    await submit();
    expect(updateMemoryFields).toHaveBeenCalledWith(expect.objectContaining({ subCategory: 'bathing', price: 25000, metadata: legacy.metadata }));
  });
  it.each(['-1', '1.5'])('blocks an invalid explicit bathing edit %s instead of keeping or converting the old price', async value => {
    useRecordStore.getState().upsertOneLocal('qa', { ...legacy, subCategory: 'bathing', price: 4300 });
    await mount(true);
    await act(async () => tree.root.findByProps({ testID: 'record-edit-price' }).props.onChangeText(value));
    expect(tree.root.findByType(HeaderTextActionButton).props.disabled).toBe(true);
    await submit(); expect(updateMemoryFields).not.toHaveBeenCalled();
  });
  it('rejects a stale hidden selection after an explicit category change', async () => {
    await mount(true);
    const staleCare = tree.root.findByType(RecordCareFields);
    const grid = tree.root.findAllByType(RecordChoiceGrid).find(node => node.props.options.some((option: { key: string }) => option.key === 'bathing'))!;
    await act(async () => { grid.props.onSelect('bathing'); staleCare.props.onChange(['nail_trim']); });
    expect(tree.root.findByType(RecordCareFields).props.selected).toEqual([]);
    await submit(); expect(updateMemoryFields).not.toHaveBeenCalled();
  });
});
