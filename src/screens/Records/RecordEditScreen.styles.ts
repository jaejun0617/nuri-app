import { TIMELINE_DESIGN as C, TIMELINE_TYPE as T } from '../../theme/timelineDesign';
import { LAVENDER_CANVAS } from '../../theme/lavenderCanvas';
// 파일: src/screens/Records/RecordEditScreen.styles.ts
// 목적:
// - Compact record form on the shared seasonal glass surface.

import { StyleSheet } from 'react-native';
import { PRODUCT_CANVAS_COLOR } from '../../app/theme/tokens/colors';

const BRAND = '#263445';
const TEXT = '#0B1220';
const BORDER = '#E6E8F0';
const BG = PRODUCT_CANVAS_COLOR;
const IMAGE_BORDER = '#D5DBE6';

const baseStyles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: BG },
  scroll: { flex: 1 },
  scrollContent: { paddingBottom: 28 },
  scrollContentKeyboardVisible: { paddingBottom: 10 },

  header: {
    minHeight: 56,
    paddingHorizontal: 18,
    paddingTop: 8,
    paddingBottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
    backgroundColor: 'transparent',
  },
  headerSideSlot: {
    width: 40,
    minHeight: 40,
    justifyContent: 'center',
    alignItems: 'flex-start',
  },
  headerSideSlotRight: {
    alignItems: 'flex-end',
  },
  backBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
    color: TEXT,
    fontWeight: '900',
  },

  card: {
    marginHorizontal: 16,
    marginBottom: 16,
    backgroundColor: 'transparent',
    padding: 16,
    borderRadius: 8,
  },
  cardKeyboardVisible: {
    paddingBottom: 10,
    marginBottom: 8,
  },

  // image
  heroWrap: { marginBottom: 10 },
  heroStage: {
    minHeight: 220,
    borderRadius: 18,
    overflow: 'hidden',
    borderWidth: 1.25,
    borderColor: IMAGE_BORDER,
    backgroundColor: '#FFFFFF',
  },
  heroImg: {
    width: '100%',
    height: 220,
    backgroundColor: '#FFFFFF',
  },
  heroPlaceholder: {
    width: '100%',
    height: 220,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroPlaceholderText: { color: '#66717F', fontWeight: '500', textAlign: 'center' },
  thumbRow: {
    marginTop: 10,
    gap: 8,
    paddingHorizontal: 2,
  },
  thumbItem: {
    width: 52,
    height: 52,
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1.5,
    borderColor: 'rgba(0,0,0,0.08)',
    backgroundColor: '#F1F4F9',
  },
  thumbItemActive: {
    borderColor: BRAND,
  },
  thumbImage: {
    width: '100%',
    height: '100%',
  },

  imgActionsRow: { flexDirection: 'row', gap: 10, marginTop: 10 },
  imgBtn: {
    flex: 1,
    height: 40,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: BORDER,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  imgBtnPrimary: {
    borderColor: 'rgba(109,124,255,0.25)',
    backgroundColor: 'rgba(109,124,255,0.10)',
  },
  imgBtnDanger: {
    borderColor: 'rgba(255,77,79,0.20)',
    backgroundColor: 'rgba(255,77,79,0.10)',
  },
  imgBtnText: { color: TEXT, fontWeight: '600', textAlign: 'center' },
  imgBtnDangerText: { color: '#B93645', fontWeight: '600', textAlign: 'center' },

  // form
  label: {
    marginTop: 8,
    marginBottom: 5,
    color: '#556070',
    fontWeight: '800',
    fontSize: 11,
    lineHeight: 16,
  },
  input: {
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 12,
    padding: 11,
    color: TEXT,
    backgroundColor: '#FFFFFF',
    fontSize: 14,
    lineHeight: 20,
  },
  multiline: { minHeight: 100, textAlignVertical: 'top' },
  categoryGrid: {
    marginTop: 4,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  categoryChip: {
    minHeight: 38,
    paddingHorizontal: 12,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(148,163,184,0.16)',
    backgroundColor: '#F1F4F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  categoryChipActive: {
    borderColor: 'rgba(109,124,255,0.24)',
    backgroundColor: 'rgba(109,124,255,0.10)',
  },
  categoryChipText: {
    color: '#7B879C',
    fontWeight: '800',
    fontSize: 11,
    lineHeight: 16,
  },
  categoryChipTextActive: {
    color: BRAND,
  },
  subCategoryGrid: {
    marginTop: 10,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    alignItems: 'center',
  },
  subCategoryChip: {
    minHeight: 34,
    paddingHorizontal: 12,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(148,163,184,0.16)',
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  subCategoryChipActive: {
    borderColor: 'rgba(109,124,255,0.24)',
    backgroundColor: 'rgba(109,124,255,0.10)',
  },
  subCategoryChipText: {
    color: '#7B879C',
    fontWeight: '800',
    fontSize: 11,
    lineHeight: 16,
  },
  subCategoryChipTextActive: {
    color: BRAND,
  },
  subCategoryClearBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F1F4F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  helperText: {
    marginTop: 6,
    color: '#7B879C',
    fontWeight: '700',
    fontSize: 11,
    lineHeight: 16,
  },

  emotionGrid: {
    marginTop: 8,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  moodChip: {
    width: '23%',
    minHeight: 40,
    borderRadius: 14,
    backgroundColor: '#F1F4F9',
    borderWidth: 1,
    borderColor: 'rgba(148,163,184,0.12)',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
    paddingVertical: 6,
  },
  moodChipActive: {
    backgroundColor: 'rgba(109,124,255,0.10)',
    borderColor: 'rgba(109,124,255,0.24)',
  },
  moodEmoji: {
    color: '#556070',
    fontWeight: '700',
    fontSize: 13,
    lineHeight: 16,
  },
  moodText: {
    color: '#7B879C',
    fontWeight: '800',
    fontSize: 11,
    lineHeight: 16,
  },
  moodTextActive: {
    color: BRAND,
  },

  primary: {
    marginTop: 12,
    backgroundColor: BRAND,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
  },
  primaryDisabled: { opacity: 0.6 },
  primaryText: {
    color: '#FFFFFF',
    fontWeight: '900',
    fontSize: 15,
    lineHeight: 22,
  },

  ghost: {
    marginTop: 10,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: '#E5484D',
    alignItems: 'center',
    justifyContent: 'center',
  },
  ghostText: {
    color: '#FFFFFF',
    fontWeight: '900',
    fontSize: 15,
    lineHeight: 22,
  },

  desc: { marginTop: 8, color: '#556070', fontSize: 13, lineHeight: 19 },

  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(12,18,32,0.44)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 26,
  },
  modalCard: {
    width: '100%',
    borderRadius: 28,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 22,
    paddingTop: 20,
    paddingBottom: 18,
    alignItems: 'center',
  },
  modalIconCircle: {
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: 'rgba(109,124,255,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  modalTitle: {
    color: '#0B1220',
    fontWeight: '900',
    textAlign: 'center',
    marginBottom: 10,
  },
  modalDesc: {
    color: '#8A94A6',
    textAlign: 'center',
    fontWeight: '700',
    fontSize: 13,
    lineHeight: 19,
  },
  modalPrimaryBtn: {
    width: '100%',
    height: 52,
    borderRadius: 26,
    backgroundColor: '#6D6AF8',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 20,
    shadowColor: '#5D57E8',
    shadowOpacity: 0.26,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 5,
  },
  modalPrimaryBtnText: {
    color: '#FFFFFF',
    fontWeight: '900',
  },
});

export const styles = StyleSheet.create({
  ...baseStyles,
  screen:{flex:1,backgroundColor:LAVENDER_CANVAS.base},
  header:{...baseStyles.header,paddingHorizontal:16,borderBottomWidth:0},
  headerTitle:{...baseStyles.headerTitle,...T.screen,color:C.ink},
  headerSideSlot:{...baseStyles.headerSideSlot,width:56},
  scrollContent:{paddingHorizontal:16,paddingTop:8},
  card:{marginHorizontal:0,marginBottom:0,padding:0,backgroundColor:'transparent'},
  label:{...T.card,color:C.ink,marginTop:20,marginBottom:8},
  dateCard:{minHeight:48,borderRadius:10,paddingHorizontal:14,paddingVertical:12,flexDirection:'row',alignItems:'center',justifyContent:'space-between',gap:12,backgroundColor:'transparent'},
  dateLeft:{flex:1,flexDirection:'row',alignItems:'center',gap:10},
  inputSurface:{borderRadius:10,position:'relative'},
  input:{...baseStyles.input,minHeight:48,borderRadius:10,borderColor:'transparent',color:C.ink,backgroundColor:'transparent',paddingHorizontal:14,paddingVertical:12,...T.input},
  multiline:{minHeight:96,textAlignVertical:'top'},
  helperText:{...T.caption,color:C.muted,marginTop:6},
  emotionGrid:{flexDirection:'row',flexWrap:'wrap',gap:6},
  moodChip:{width:'23%',minHeight:60,paddingHorizontal:2,paddingVertical:8,borderWidth:1,borderColor:'transparent',borderRadius:10,backgroundColor:'transparent',alignItems:'center',justifyContent:'center',gap:5},
  moodChipActive:{backgroundColor:'transparent',borderColor:'transparent'},moodText:{...T.meta,color:C.muted},moodTextActive:{color:C.primary},
  tagSelector:{minHeight:48,borderRadius:16,paddingHorizontal:14,paddingVertical:12,flexDirection:'row',alignItems:'center',justifyContent:'space-between',gap:8},
  selectedTagsWrap:{flex:1,flexDirection:'row',flexWrap:'wrap',gap:8},
  selectedTagChip:{borderRadius:16,paddingHorizontal:10,paddingVertical:6,backgroundColor:C.selected},
  primary:{...baseStyles.primary,marginTop:20,minHeight:48,borderRadius:10},primaryText:{...T.button,color:C.surface},

});
