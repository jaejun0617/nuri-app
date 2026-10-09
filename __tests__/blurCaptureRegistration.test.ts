import type { ComponentType } from 'react';
import type { ViewProps } from 'react-native';

type NativeLoader = {
  default: (name: string) => ComponentType<ViewProps>;
};

// The RN preset skips the real view registry, hiding duplicate native declarations.
jest.mock('react-native/Libraries/ReactNative/requireNativeComponent', () => {
  const native = jest.requireActual<NativeLoader>(
    'react-native/Libraries/ReactNative/requireNativeComponent',
  );
  const preset = jest.requireActual<NativeLoader>(
    '@react-native/jest-preset/jest/mocks/requireNativeComponent',
  );
  return {
    __esModule: true,
    default: (name: string) =>
      name === 'NuriBlurCaptureExclusion'
        ? native.default(name)
        : preset.default(name),
  };
});

describe('blur capture native registration', () => {
  it.each(['menu-first', 'timeline-first'])(
    'loads both consumers through the real native registry: %s',
    order => {
      expect(() => {
        jest.isolateModules(() => {
          const { Platform } =
            require('react-native') as typeof import('react-native');
          Platform.OS = 'android';
          if (order === 'menu-first') {
            require('../src/components/common/BlurCaptureExclusion');
            require('../src/screens/Records/TimelineCreateButton');
          } else {
            require('../src/screens/Records/TimelineCreateButton');
            require('../src/components/common/BlurCaptureExclusion');
          }
        });
      }).not.toThrow();
    },
  );
});
