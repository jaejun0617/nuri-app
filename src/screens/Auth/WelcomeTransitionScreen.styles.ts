import { StyleSheet } from 'react-native';

const SURFACE_DEEP = '#090A21';
const DISPLAY_FONT = 'insungitCutelivelyjisu';

export const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: SURFACE_DEEP,
  },
  backgroundImage: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    width: undefined,
    height: undefined,
  },
  readabilityVeil: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    backgroundColor: 'rgba(5, 5, 24, 0.08)',
  },
  safeArea: {
    flex: 1,
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  brandBlock: {
    width: 142,
    height: 126,
    alignItems: 'center',
    justifyContent: 'center',
  },
  symbolGlow: {
    position: 'absolute',
    width: 126,
    height: 112,
    tintColor: '#FFD0B4',
  },
  symbol: {
    width: 118,
    height: 105,
    tintColor: '#FFE8CF',
    opacity: 0.96,
  },
  copyBlock: {
    width: '100%',
    alignItems: 'center',
    marginTop: 10,
  },
  headline: {
    width: '100%',
    color: '#F9E4D3',
    fontFamily: DISPLAY_FONT,
    fontSize: 15,
    lineHeight: 22,
    textAlign: 'center',
    textShadowColor: 'rgba(255, 177, 150, 0.26)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 9,
  },
  dotRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    marginTop: 29,
  },
  dotSlot: {
    width: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dotBase: {
    width: 8,
    height: 8,
    borderRadius: 4,
    opacity: 0.72,
  },
  dotHalo: {
    position: 'absolute',
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: 'rgba(255, 190, 157, 0.32)',
  },
  dotActive: {
    position: 'absolute',
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#FFE3C7',
    shadowColor: '#FF9E79',
    shadowOpacity: 0.9,
    shadowRadius: 7,
    shadowOffset: { width: 0, height: 0 },
    elevation: 5,
  },
});
