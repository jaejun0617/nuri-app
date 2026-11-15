import React from 'react';
import { Platform, TouchableOpacity } from 'react-native';
import TestRenderer from 'react-test-renderer';
import { ThemeProvider } from 'styled-components/native';
import RNBlobUtil from 'react-native-blob-util';
import UsbDeviceLayoutControls from '../src/screens/DevTest/UsbDeviceLayoutControls';
import { createTheme } from '../src/app/theme/theme';

jest.mock('react-native-blob-util', () => ({
  config: jest.fn(),
  fs: {
    dirs: { DocumentDir: '/app/files' },
    exists: jest.fn(),
    readFile: jest.fn(),
  },
}));

const exists = jest.mocked(RNBlobUtil.fs.exists);
const readFile = jest.mocked(RNBlobUtil.fs.readFile);
const config = jest.mocked(RNBlobUtil.config);
const token = 'a'.repeat(64);
let tree: TestRenderer.ReactTestRenderer;

async function render() {
  await TestRenderer.act(async () => {
    tree = TestRenderer.create(
      <ThemeProvider theme={createTheme('light')}>
        <UsbDeviceLayoutControls />
      </ThemeProvider>,
    );
  });
}

function button(testID: string) {
  return tree.root.findByType(UsbDeviceLayoutControls).find(
    node => node.type === TouchableOpacity && node.props.testID === testID,
  );
}

beforeEach(() => {
  jest.clearAllMocks();
  jest.replaceProperty(Platform, 'OS', 'android');
  exists.mockResolvedValue(true);
  readFile.mockResolvedValue(token);
});

afterEach(async () => {
  await TestRenderer.act(async () => tree?.unmount());
  jest.restoreAllMocks();
});

test('does not show the shelf or connect without local device enrollment', async () => {
  exists.mockResolvedValue(false);
  await render();
  expect(exists).toHaveBeenCalledTimes(1);
  expect(tree.toJSON()).toBeNull();
  expect(config).not.toHaveBeenCalled();
});

test('does not check for USB enrollment outside Android', async () => {
  jest.replaceProperty(Platform, 'OS', 'ios');
  await render();
  expect(tree.toJSON()).toBeNull();
  expect(exists).not.toHaveBeenCalled();
});

test('keeps USB controls and enrollment checks out of non-development Android', async () => {
  const previous = Object.getOwnPropertyDescriptor(global, '__DEV__');
  Object.defineProperty(global, '__DEV__', { configurable: true, value: false });
  try {
    await render();
    expect(tree.toJSON()).toBeNull();
    expect(exists).not.toHaveBeenCalled();
    expect(config).not.toHaveBeenCalled();
  } finally {
    if (previous) Object.defineProperty(global, '__DEV__', previous);
    else Reflect.deleteProperty(global, '__DEV__');
  }
});

test('shows a retryable message without connecting if the enrollment became invalid', async () => {
  readFile.mockResolvedValue('invalid');
  await render();
  await TestRenderer.act(async () => button('usb-device-layout-toggle').props.onPress());
  expect(tree.root.findAll(node => node.props.accessibilityLiveRegion === 'polite').length).toBeGreaterThan(0);
  expect(button('usb-device-layout-320').props.disabled).toBe(false);
  expect(config).not.toHaveBeenCalled();
});
