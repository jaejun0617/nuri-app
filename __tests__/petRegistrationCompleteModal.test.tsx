import React from 'react';
import TestRenderer, { act } from 'react-test-renderer';
import { Image, Modal, StyleSheet, ScrollView } from 'react-native';
import { ThemeProvider } from 'styled-components/native';
import { createTheme } from '../src/app/theme/theme';
import PetRegistrationCompleteModal from '../src/components/pets/PetRegistrationCompleteModal';
import type { Pet } from '../src/store/petStore';

jest.mock('react-native-safe-area-context', () => ({ useSafeAreaInsets: () => ({ top: 24, bottom: 24, left: 0, right: 0 }) }));
jest.mock('../src/app/providers/AppFontPreferenceProvider', () => ({
  useAppFontPreference: () => ({ mode: 'pretendard' }), useTypographyScope: () => 'app-preference',
}));
const pet: Pet = { id: 'new-pet', name: '사랑', breed: '말티즈', birthDate: '2023-09-06', gender: 'female', avatarUrl: 'https://example.test/new-photo.png' };
function render(props: Partial<React.ComponentProps<typeof PetRegistrationCompleteModal>> = {}) {
  let tree!: TestRenderer.ReactTestRenderer;
  act(() => { tree = TestRenderer.create(<ThemeProvider theme={createTheme('light')}><PetRegistrationCompleteModal visible pet={pet} onStart={jest.fn()} {...props} /></ThemeProvider>); });
  return tree;
}
describe('saved profile completion receipt', () => {
  it('renders the newly saved identity and correct Korean particle without reading selected pet', () => {
    const tree = render();
    const text = JSON.stringify(tree.toJSON());
    expect(text).toContain('사랑과 함께할 소중한 추억들을');
    expect(text).toContain('말티즈'); expect(text).toContain('여아');
    expect(tree.root.findByProps({ testID: 'registered-pet-photo' }).props.source.uri).toBe(pet.avatarUrl);
    expect(tree.root.findAllByType(Image)).toHaveLength(7);
    const art = tree.root.findAllByType(Image).filter(node => !node.props.testID);
    expect(art.every(node => node.parent?.props.pointerEvents === 'none')).toBe(true);
    act(() => tree.unmount());
  });
  it('does not display a success modal without a saved receipt', () => {
    const tree = render({ pet: null });
    expect(tree.root.findByType(Modal).props.visible).toBe(false);
    act(() => tree.unmount());
  });
  it('uses no sample animal or invented age/gender when information is absent or future dated', () => {
    const tree = render({ pet: { id: 'missing', name: 'QA', birthDate: '2999-01-01' } });
    const text = JSON.stringify(tree.toJSON());
    expect(text).toContain('등록된 사진이 없어요');
    expect(text).not.toContain('생후 0개월'); expect(text).not.toContain('남아');
    expect(tree.root.findByProps({ testID: 'registered-pet-1' }).props.children).toBe('미입력');
    expect(tree.root.findAllByProps({ testID: 'registered-pet-photo' })).toHaveLength(0);
    act(() => tree.unmount());
  });
  it('keeps a fixed frame after image failure and does not reuse the previous image for a new pet', () => {
    const tree = render();
    act(() => tree.root.findByProps({ testID: 'registered-pet-photo' }).props.onError());
    expect(JSON.stringify(tree.toJSON())).toContain('사진을 불러오지 못했어요');
    expect(tree.root.findAllByProps({ testID: 'registered-pet-photo' })).toHaveLength(0);
    act(() => tree.update(<ThemeProvider theme={createTheme('light')}><PetRegistrationCompleteModal visible pet={{ ...pet, id: 'second', avatarUrl: 'https://example.test/second.png' }} onStart={jest.fn()} /></ThemeProvider>));
    expect(tree.root.findByProps({ testID: 'registered-pet-photo' }).props.source.uri).toContain('second.png');
    act(() => tree.unmount());
  });
  it('consumes rapid start and Android Back only once without another create request', () => {
    const onStart = jest.fn(); const tree = render({ onStart });
    const button = tree.root.findByProps({ testID: 'pet-registration-start' });
    act(() => { button.props.onPress(); button.props.onPress(); tree.root.findByType(Modal).props.onRequestClose(); });
    expect(onStart).toHaveBeenCalledTimes(1);
    act(() => tree.unmount());
  });
  it('retains scrolling, growing text and safe-area bounds for long content', () => {
    const tree = render({ pet: { ...pet, name: '아주긴이름의사랑스러운아이', breed: '아주 긴 품종 이름을 가진 아이' } });
    expect(tree.root.findByType(ScrollView)).toBeDefined();
    expect(StyleSheet.flatten(tree.root.findByProps({ testID: 'pet-registration-complete-panel' }).props.style).maxHeight).toBeGreaterThan(0);
    expect(tree.root.findByProps({ testID: 'registered-pet-name' }).props.numberOfLines).toBeUndefined();
    const breed = tree.root.findByProps({ testID: 'registered-pet-0' });
    expect(breed.props.numberOfLines).toBeUndefined();
    expect(breed.parent?.props.testID).toBe('registered-pet-breed-row');
    expect(tree.root.findByProps({ testID: 'registered-pet-demographics-row' }).findAllByProps({ testID: 'registered-pet-0' })).toHaveLength(0);
    act(() => tree.unmount());
  });
});
