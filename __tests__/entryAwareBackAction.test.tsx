import React from 'react';
import { BackHandler, Pressable } from 'react-native';
import TestRenderer from 'react-test-renderer';

import { useEntryAwareBackAction } from '../src/hooks/useEntryAwareBackAction';

type HardwareBackHandler = Parameters<typeof BackHandler.addEventListener>[1];

jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useFocusEffect: (callback: () => void | (() => void)) => {
    const ReactRuntime = jest.requireActual('react') as typeof React;
    ReactRuntime.useEffect(callback, [callback]);
  },
}));

function Harness({
  onHome,
  onMore,
  onFallback,
}: {
  onHome: () => void;
  onMore: () => void;
  onFallback: () => void;
}) {
  const onBack = useEntryAwareBackAction({
    entrySource: 'more',
    onHome,
    onMore,
    onFallback,
  });

  return <Pressable testID="header-back" onPress={onBack} />;
}

describe('useEntryAwareBackAction', () => {
  it('uses the same More return contract for header and Android Back', () => {
    const onHome = jest.fn();
    const onMore = jest.fn();
    const onFallback = jest.fn();
    let hardwareBackHandler: HardwareBackHandler | undefined;
    const backHandlerSpy = jest
      .spyOn(BackHandler, 'addEventListener')
      .mockImplementation((_eventName, handler) => {
        hardwareBackHandler = handler;
        return { remove: jest.fn() };
      });
    let renderer!: TestRenderer.ReactTestRenderer;

    TestRenderer.act(() => {
      renderer = TestRenderer.create(
        <Harness
          onHome={onHome}
          onMore={onMore}
          onFallback={onFallback}
        />,
      );
    });
    TestRenderer.act(() => {
      renderer.root.findByProps({ testID: 'header-back' }).props.onPress();
    });
    expect(onMore).toHaveBeenCalledTimes(1);

    expect(hardwareBackHandler).toBeDefined();
    TestRenderer.act(() => {
      expect(
        hardwareBackHandler?.({} as Parameters<HardwareBackHandler>[0]),
      ).toBe(true);
    });
    expect(onMore).toHaveBeenCalledTimes(2);
    expect(onHome).not.toHaveBeenCalled();
    expect(onFallback).not.toHaveBeenCalled();

    TestRenderer.act(() => renderer.unmount());
    backHandlerSpy.mockRestore();
  });
});
