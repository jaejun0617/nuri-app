import React from 'react';
import { Image, Modal, StyleSheet, Text, TouchableOpacity } from 'react-native';
import TestRenderer, { act } from 'react-test-renderer';
import { ThemeProvider } from 'styled-components/native';
import { createTheme } from '../src/app/theme/theme';
import { TIMELINE_DESIGN as C, TIMELINE_TYPE as T } from '../src/theme/timelineDesign';
import { typography } from '../src/app/theme/tokens/typography';
import TimelineButton, { CtaText } from '../src/components/records/TimelineButton';
import TimelineDeleteDialog from '../src/components/records/TimelineDeleteDialog';
import RecordPhotoStrip from '../src/components/records/RecordPhotoStrip';
import RecordChoiceGrid from '../src/components/records/RecordChoiceGrid';
import { RECORD_WRITE_MAIN_CATEGORIES, RECORD_WRITE_OTHER_SUBCATEGORIES } from '../src/services/records/form';
import type { SeasonKey } from '../src/theme/seasonal/season';

let mockSeason: SeasonKey = 'autumn';
jest.mock('../src/app/providers/SeasonPreferenceProvider',()=>({useEffectiveSeason:()=>mockSeason}));
jest.mock('react-native-safe-area-context',()=>({useSafeAreaInsets:()=>({top:24,bottom:18,left:0,right:0})}));

function render(element:React.ReactElement, dark=false) {
  let result:TestRenderer.ReactTestRenderer | undefined;
  act(()=>{result=TestRenderer.create(<ThemeProvider theme={createTheme(dark?'dark':'light')}>{element}</ThemeProvider>);});
  if(!result)throw new Error('Render failed');return result;
}
describe('Timeline reference interactions',()=>{
  it.each<SeasonKey>(['autumn','winter','spring','summer'])('%s does not recolor default, pressed, loading or disabled actions',season=>{
    mockSeason=season;
    for(const dark of [false,true]){
      const press=jest.fn();
      const tree=render(<TimelineButton testID="reference-primary" role="primary" onPress={press}><CtaText>기록 남기기</CtaText></TimelineButton>,dark);
      const target=tree.root.find(node=>node.props.testID==='reference-primary' && typeof node.props.style==='function');
      if(!target)throw new Error('Native action missing');
      expect(StyleSheet.flatten(target.props.style({pressed:false})).backgroundColor).toBe(C.primary);
      expect(StyleSheet.flatten(target.props.style({pressed:true})).backgroundColor).toBe(C.pressed);
      act(()=>target.props.onPress());expect(press).toHaveBeenCalledTimes(1);
      act(()=>tree.update(<ThemeProvider theme={createTheme(dark?'dark':'light')}><TimelineButton testID="reference-primary" role="primary" loading onPress={press}><CtaText>저장 중</CtaText></TimelineButton></ThemeProvider>));
      const loading=tree.root.find(node=>node.props.testID==='reference-primary' && typeof node.props.style==='function');
      if(!loading)throw new Error('Loading action missing');
      expect(loading.props.disabled).toBe(true);
      expect(loading.props.accessibilityState.busy).toBe(true);
      expect(StyleSheet.flatten(loading.props.style({pressed:false})).backgroundColor).toBe(C.disabled);
      act(()=>tree.unmount());
    }
  });
  it('preserves unresolved photo positions, original URIs, bounded decode and the removal index',()=>{
    const remove=jest.fn(),add=jest.fn();
    const items=[{key:'existing-pending',uri:null},{key:'added',uri:'file:///run-owned.jpg'}];
    const tree=render(<RecordPhotoStrip items={items} onAdd={add} onRemove={remove}/>);
    const photo=tree.root.findByType(Image);
    expect(photo.props).toMatchObject({source:{uri:'file:///run-owned.jpg'},resizeMode:'cover',resizeMethod:'resize'});
    const button=tree.root.findAllByType(TouchableOpacity).find(node=>node.props.accessibilityLabel==='사진 2 제거');
    if(!button)throw new Error('Photo remove missing');
    expect(StyleSheet.flatten(button.props.style)).toMatchObject({minWidth:48,minHeight:48});
    act(()=>button.props.onPress());expect(remove).toHaveBeenCalledWith(1);
    const addButton=tree.root.findAllByType(TouchableOpacity).find(node=>node.props.accessibilityLabel==='사진 추가');
    if(!addButton)throw new Error('Photo add missing');act(()=>addButton.props.onPress());expect(add).toHaveBeenCalledTimes(1);
    expect(items[0].uri).toBeNull();act(()=>tree.unmount());
  });
  it('keeps all current categories and stable keys, without restoring inactive health or hospital entries',()=>{
    const pick=jest.fn();const tree=render(<RecordChoiceGrid columns={4} options={RECORD_WRITE_MAIN_CATEGORIES} selected={['walk']} onSelect={pick}/>);
    expect(tree.root.findAllByType(TouchableOpacity).map(node=>node.props.accessibilityLabel)).toEqual(RECORD_WRITE_MAIN_CATEGORIES.map(option=>option.label));
    expect(RECORD_WRITE_MAIN_CATEGORIES.some(option=>String(option.key)==='health')).toBe(false);
    expect(RECORD_WRITE_OTHER_SUBCATEGORIES.some(option=>String(option.key)==='hospital')).toBe(false);
    act(()=>tree.root.findAllByType(TouchableOpacity)[1].props.onPress());expect(pick).toHaveBeenCalledWith('meal');
    act(()=>tree.unmount());
  });
  it('binds the actual delete title and blocks all dismiss paths while a request is pending',()=>{
    const cancel=jest.fn(),confirm=jest.fn();
    const tree=render(<TimelineDeleteDialog visible recordTitle="이 실행에서 만든 기록" loading onCancel={cancel} onConfirm={confirm}/>);
    expect(tree.root.findAllByType(Text).some(node=>String(node.props.children).includes('이 실행에서 만든 기록'))).toBe(true);
    act(()=>tree.root.findByType(Modal).props.onRequestClose());
    const backdrop=tree.root.findAll(node=>node.props.accessibilityLabel==='기록 삭제 취소' && typeof node.props.onPress==='function')[0];
    if(!backdrop)throw new Error('Backdrop missing');act(()=>backdrop.props.onPress());
    expect(backdrop.props.disabled).toBe(true);expect(cancel).not.toHaveBeenCalled();expect(confirm).not.toHaveBeenCalled();
    act(()=>tree.update(<ThemeProvider theme={createTheme('light')}><TimelineDeleteDialog visible recordTitle="이 실행에서 만든 기록" loading={false} onCancel={cancel} onConfirm={confirm}/></ThemeProvider>));
    act(()=>tree.root.findByType(Modal).props.onRequestClose());expect(cancel).toHaveBeenCalledTimes(1);
    act(()=>tree.unmount());
  });
  it('maps actual Home preset values without introducing a new global font family',()=>{
    expect(T.screen).toBe(typography.preset.unifiedTitle);
    expect(T.section).toBe(typography.preset.unifiedLabel);
    expect(T.body).toBe(typography.preset.unifiedBody);
    expect(T.input).toBe(typography.preset.unifiedLabel);
    expect(T.meta).toBe(typography.preset.unifiedMeta);
    expect(T.screen).toMatchObject({fontSize:18,lineHeight:24,letterSpacing:0});
  });
});
