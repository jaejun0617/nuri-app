import { NativeModules, Platform } from 'react-native';
import { finishNativeLaunchPresentation } from '../src/services/app/nativeLaunchPresentation';

const originalOS = Platform.OS;
const originalNative: unknown = NativeModules.NuriLaunchPresentation;
afterEach(() => {
  Platform.OS = originalOS;
  NativeModules.NuriLaunchPresentation = originalNative;
});

it('requests release from the existing Android activity without a timer or payload', async () => {
  Platform.OS = 'android';
  const finish = jest.fn().mockResolvedValue(true);
  NativeModules.NuriLaunchPresentation = { finish };
  await finishNativeLaunchPresentation();
  expect(finish).toHaveBeenCalledTimes(1);
  expect(finish).toHaveBeenCalledWith();
});

it('does not invoke an Android bridge on another platform', async () => {
  Platform.OS = 'ios';
  const finish = jest.fn();
  NativeModules.NuriLaunchPresentation = { finish };
  await finishNativeLaunchPresentation();
  expect(finish).not.toHaveBeenCalled();
});

it('supports an absent bridge but propagates an actual native error for monitoring', async () => {
  Platform.OS = 'android';
  NativeModules.NuriLaunchPresentation = undefined;
  await expect(finishNativeLaunchPresentation()).resolves.toBeUndefined();
  const failure = new Error('native release failed');
  NativeModules.NuriLaunchPresentation = { finish: jest.fn().mockRejectedValue(failure) };
  await expect(finishNativeLaunchPresentation()).rejects.toBe(failure);
});
