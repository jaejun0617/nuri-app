import React from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AppText from '../../app/ui/AppText';
import MarkerText from '../../app/ui/MarkerText';
import TimelineButton, { CtaText } from './TimelineButton';
import TimelineArtwork from './TimelineArtwork';
import { TIMELINE_DESIGN as C, TIMELINE_TYPE as T } from '../../theme/timelineDesign';

/** The caller owns the fixed record ID, request guard, cache and failure handling. */
export default function TimelineDeleteDialog({visible,recordTitle,loading,onCancel,onConfirm}:{
  visible:boolean;recordTitle:string;loading:boolean;onCancel:()=>void;onConfirm:()=>void;
}) {
  const {height,width,fontScale}=useWindowDimensions();
  const insets=useSafeAreaInsets();
  const cancel = () => { if (!loading) onCancel(); };
  return <Modal visible={visible} transparent animationType="fade" onRequestClose={cancel}>
    <View style={s.backdrop}>
      <Pressable style={StyleSheet.absoluteFill} onPress={cancel} disabled={loading} accessibilityLabel="기록 삭제 취소"/>
      <View accessibilityViewIsModal style={[s.card,{maxHeight:height-insets.top-insets.bottom-40}]}>
        <ScrollView contentContainerStyle={s.content} bounces={false}>
          <View style={s.icon}><TimelineArtwork name="delete" color={C.primary} size={32}/></View>
          <AppText preset="unifiedTitle" style={s.title}>이 기록을 삭제할까요?</AppText>
          <AppText preset="unifiedLabel" style={s.record}>“{recordTitle}”</AppText>
          <View style={s.warning}><AppText preset="unifiedBody" align="center" style={s.body}>사진과 내용이 함께 삭제되며,</AppText><MarkerText preset="unifiedBody" align="center" variant="wash" markerColor={C.highlight} style={s.body}>삭제한 기록은 되돌릴 수 없어요.</MarkerText></View>
        </ScrollView>
        <View style={[s.actions,(width<340||fontScale>=1.3)&&s.stacked]}>
          <TimelineButton testID="timeline-delete-cancel" role="neutral" style={s.action} onPress={onCancel} disabled={loading}><CtaText>취소</CtaText></TimelineButton>
          <TimelineButton testID="timeline-delete-confirm" role="destructiveConfirm" loading={loading} style={s.action} onPress={onConfirm}><CtaText>{loading?'삭제 중...':'삭제하기'}</CtaText></TimelineButton>
        </View>
      </View>
    </View>
  </Modal>;
}
const s=StyleSheet.create({backdrop:{flex:1,backgroundColor:C.overlay,justifyContent:'center',alignItems:'center',padding:24},card:{width:'100%',maxWidth:420,padding:20,borderRadius:16,backgroundColor:C.surface},content:{alignItems:'center',gap:16},icon:{width:72,height:72,borderRadius:36,backgroundColor:C.selected,alignItems:'center',justifyContent:'center'},title:{color:C.ink,textAlign:'center'},record:{color:C.primary,textAlign:'center'},body:{...T.body,color:C.ink},warning:{alignItems:'center',gap:4,marginVertical:6},actions:{flexDirection:'row',gap:8,marginTop:20},stacked:{flexDirection:'column'},action:{flex:1}});
