import React from 'react';
import { Image, ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import AppText from '../../app/ui/AppText';
import Feather from '../icons/NuriFeatherIcon';
import NuriSemanticIcon from '../icons/NuriSemanticIcon';
import { TIMELINE_DESIGN as C, TIMELINE_TYPE as T } from '../../theme/timelineDesign';
import { RecordFieldGlass, type RecordSurfaceVariant } from './TimelineFormSurface';

/** The screen retains photo state/limits/removal semantics; this is presentation only. */
export default function RecordPhotoStrip({items,onAdd,onRemove,disabled=false,surfaceVariant='plain'}: {
  items: readonly {key:string;uri:string|null}[]; onAdd:()=>void;onRemove:(index:number)=>void;disabled?:boolean;
  surfaceVariant?:RecordSurfaceVariant;
}) {
  return <View style={s.root}>
    <View style={s.heading}><AppText style={T.card}>사진 · 선택</AppText><AppText style={[T.meta,{color:C.muted}]}>최대 10장 · 선택</AppText></View>
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.row} keyboardShouldPersistTaps="handled">
      {items.map((item,index)=><View key={item.key} testID={`record-photo-frame-${index}`} style={[s.photo,surfaceVariant==='homeGlass' && s.glass]}>
        {surfaceVariant==='homeGlass' ? <RecordFieldGlass /> : null}
        {item.uri ? <Image source={{uri:item.uri}} resizeMode="cover" resizeMethod="resize" style={StyleSheet.absoluteFill} /> : <AppText style={T.meta}>사진 불러오는 중</AppText>}
        <TouchableOpacity accessibilityRole="button" accessibilityLabel={`사진 ${index+1} 제거`} disabled={disabled} onPress={()=>onRemove(index)} style={s.remove}>
          <View style={s.removeBadge}><Feather name="x" size={14} color="white" /></View>
        </TouchableOpacity>
      </View>)}
      {items.length<10 && <TouchableOpacity accessibilityRole="button" accessibilityLabel="사진 추가" disabled={disabled} onPress={onAdd} style={[s.photo,s.add,surfaceVariant==='homeGlass' && s.glass, surfaceVariant==='homeGlass' && disabled && s.disabled]}>
        {surfaceVariant==='homeGlass' ? <RecordFieldGlass /> : null}
        {surfaceVariant === 'homeGlass' ? (
          <NuriSemanticIcon family="feather" name="plus" preserveOriginal size={24} color="#000000" testID="record-photo-add-icon" accessible={false} />
        ) : <Feather name={items.length?'plus':'camera'} size={24} color={C.primary} />}
        <AppText style={[T.meta,{color:C.primary}]}>사진 추가</AppText>
      </TouchableOpacity>}
      {items.length>0 && <AppText style={[T.meta,s.count]}>{items.length} / 10</AppText>}
    </ScrollView>
  </View>;
}
const s=StyleSheet.create({root:{marginTop:18},heading:{flexDirection:'row',justifyContent:'space-between',alignItems:'center',gap:8,marginBottom:10},row:{gap:8,alignItems:'flex-end'},photo:{width:88,height:88,borderRadius:10,overflow:'hidden',backgroundColor:C.selected,alignItems:'center',justifyContent:'center'},add:{borderWidth:1,borderStyle:'dashed',borderColor:'#CBB9FA',backgroundColor:'transparent',gap:8},glass:{backgroundColor:'transparent',borderColor:'transparent'},disabled:{opacity:0.5},remove:{position:'absolute',right:0,top:0,minWidth:48,minHeight:48},removeBadge:{position:'absolute',right:4,top:4,width:22,height:22,borderRadius:11,alignItems:'center',justifyContent:'center',backgroundColor:'rgba(25,20,40,.65)'},count:{color:C.muted,padding:6}});
