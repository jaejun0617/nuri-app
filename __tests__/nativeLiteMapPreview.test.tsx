import React from 'react';
import ReactTestRenderer from 'react-test-renderer';
import { View } from 'react-native';

import NativeLiteMapPreview from '../src/components/maps/NativeLiteMapPreview';

jest.mock('../src/app/ui/AppText', () => {
  const ReactRuntime = jest.requireActual('react');
  const { Text } = jest.requireActual('react-native');

  return function MockAppText({ children, ...props }: Record<string, unknown>) {
    return ReactRuntime.createElement(Text, props, children);
  };
});

function findByTestId(
  renderer: ReactTestRenderer.ReactTestRenderer,
  testID: string,
) {
  return renderer.root.findAll(
    node => node.type === View && node.props.testID === testID,
  );
}

function findByNativeType(
  renderer: ReactTestRenderer.ReactTestRenderer,
  type: string,
) {
  return renderer.root.findAll(node => (node.type as unknown) === type);
}

describe('NativeLiteMapPreview', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  it('유효한 POI 좌표 하나로 Google 기본 지도와 marker를 렌더한다', async () => {
    let renderer: ReactTestRenderer.ReactTestRenderer;
    await ReactTestRenderer.act(async () => {
      renderer = ReactTestRenderer.create(
        <NativeLiteMapPreview
          latitude={37.5665}
          longitude={126.978}
          title="누리 장소"
        />,
      );
    });

    const [map] = findByNativeType(renderer!, 'MapView');
    const [marker] = findByNativeType(renderer!, 'Marker');

    expect(map.props.provider).toBe('google');
    expect(map.props.initialRegion).toMatchObject({
      latitude: 37.5665,
      longitude: 126.978,
    });
    expect(marker.props.coordinate).toEqual({
      latitude: 37.5665,
      longitude: 126.978,
    });
    expect(findByTestId(renderer!, 'native-lite-map-loading')).toHaveLength(1);

    await ReactTestRenderer.act(async () => {
      map.props.onMapLoaded();
    });

    expect(findByTestId(renderer!, 'native-lite-map-loading')).toHaveLength(0);

    await ReactTestRenderer.act(async () => {
      renderer!.unmount();
    });
  });

  it('tile load 완료 신호가 없으면 깨진 지도 대신 fallback을 보여준다', async () => {
    let renderer: ReactTestRenderer.ReactTestRenderer;
    await ReactTestRenderer.act(async () => {
      renderer = ReactTestRenderer.create(
        <NativeLiteMapPreview
          latitude={35.1796}
          longitude={129.0756}
          title="누리 장소"
        />,
      );
    });

    await ReactTestRenderer.act(async () => {
      jest.advanceTimersByTime(10_000);
    });

    expect(findByTestId(renderer!, 'native-lite-map-fallback')).toHaveLength(1);
    expect(findByNativeType(renderer!, 'MapView')).toHaveLength(0);

    await ReactTestRenderer.act(async () => {
      renderer!.unmount();
    });
  });

  it.each([
    [0, 0],
    [91, 127],
    [37, 181],
  ])('invalid 좌표 %s, %s에는 MapView를 만들지 않는다', async (latitude, longitude) => {
    let renderer: ReactTestRenderer.ReactTestRenderer;
    await ReactTestRenderer.act(async () => {
      renderer = ReactTestRenderer.create(
        <NativeLiteMapPreview
          latitude={latitude}
          longitude={longitude}
          title="잘못된 장소"
        />,
      );
    });

    expect(findByTestId(renderer!, 'native-lite-map-fallback')).toHaveLength(1);
    expect(findByNativeType(renderer!, 'MapView')).toHaveLength(0);

    await ReactTestRenderer.act(async () => {
      renderer!.unmount();
    });
  });
});
