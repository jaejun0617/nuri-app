import { StyleSheet } from 'react-native';

const BRAND = '#3E9BFF';
const SURFACE = '#07172D';
const SURFACE_DEEP = '#081225';

export const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: SURFACE_DEEP,
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 28,
    backgroundColor: SURFACE_DEEP,
  },
  heroCard: {
    width: 200,
    height: 200,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logo: {
    width: 200,
    height: 200,
    tintColor: BRAND,
  },
  name: {
    marginTop: 18,
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '900',
    textAlign: 'center',
  },
  nameUnderline: {
    width: 38,
    height: 4,
    borderRadius: 999,
    marginTop: 10,
    backgroundColor: BRAND,
  },
  body: {
    marginTop: 14,
    color: 'rgba(255,255,255,0.64)',
    fontSize: 12,
    fontWeight: '700',
    textAlign: 'center',
    lineHeight: 19,
  },
  progressWrap: {
    width: '100%',
    marginTop: 44,
    gap: 10,
  },
  progressTrack: {
    width: '100%',
    height: 6,
    borderRadius: 999,
    overflow: 'hidden',
    backgroundColor: 'rgba(62,155,255,0.16)',
  },
  progressFill: {
    height: '100%',
    borderRadius: 999,
    backgroundColor: BRAND,
  },
  timer: {
    color: 'rgba(255,255,255,0.68)',
    fontSize: 12,
    fontWeight: '700',
    textAlign: 'center',
  },
  dotRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 56,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 999,
    backgroundColor: 'rgba(62,155,255,0.24)',
  },
  dotActive: {
    width: 28,
    backgroundColor: BRAND,
  },
});
