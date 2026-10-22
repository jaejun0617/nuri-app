import React, { createContext, useContext } from 'react';
import { ActivityIndicator, Pressable, StyleSheet } from 'react-native';
import AppText from '../../app/ui/AppText';
import Feather from '../icons/NuriFeatherIcon';
import type CtaButton from '../../app/ui/CtaButton';
import { TIMELINE_DESIGN as C, TIMELINE_TYPE as T } from '../../theme/timelineDesign';

const TextColor = createContext<string>(C.surface);
type Props = React.ComponentProps<typeof CtaButton>;
/** Scoped palette avoids the global season CTA override, including loading/pressed. */
export default function TimelineButton({ role, loading=false, disabled=false, style, children, onPress, accessibilityState, activeOpacity: _opacity, compact: _compact, visuallyHidden=false, ...rest }: Props) {
  const blocked=disabled || loading || role==='disabled';
  const secondary=role==='neutral' || role==='primarySubtle';
  const danger=role==='destructiveConfirm';
  const text=blocked ? C.disabledText : danger ? C.danger : secondary ? C.primary : C.surface;
  return <Pressable {...rest} accessibilityRole="button" disabled={blocked} onPress={onPress}
    accessibilityState={{ ...accessibilityState, disabled: blocked, busy: loading }}
    style={({pressed})=>[s.button,typeof style==='function'?style({pressed}):style,{ backgroundColor:blocked?C.disabled:danger?C.dangerSurface:secondary?C.selected:pressed?C.pressed:C.primary,opacity:visuallyHidden?0:1 }]}>
    <TextColor.Provider value={text}>
      {loading && <ActivityIndicator color={text} size="small" accessibilityLabel="저장 중" />}
      {typeof children==='function'?children({ background:C.primary,border:C.primary,text }):children}
    </TextColor.Provider>
  </Pressable>;
}
export function CtaText({style,...props}:React.ComponentProps<typeof AppText>) {
  const color=useContext(TextColor);
  return <AppText {...props} styleOverridesPreset color={color} style={[T.button,style,{color}]} />;
}
export function CtaIcon(props:React.ComponentProps<typeof Feather>) {
  return <Feather {...props} color={useContext(TextColor)} />;
}
const s=StyleSheet.create({button:{ minHeight:48,paddingHorizontal:16,paddingVertical:12,borderRadius:10,alignItems:'center',justifyContent:'center',gap:6 }});
