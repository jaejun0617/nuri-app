import { NativeModules, Platform } from 'react-native';

/** Only releases Android's initial system splash; never adds an app overlay. */
export async function finishNativeLaunchPresentation(): Promise<void> {
  if (Platform.OS !== 'android') return;
  const native: unknown = NativeModules.NuriLaunchPresentation;
  if (!native || typeof native !== 'object' || !('finish' in native) || typeof native.finish !== 'function') return;
  await native.finish();
}
