import React, { useEffect, useRef, useState } from 'react';
import {
  AppState,
  Platform,
  StyleSheet,
  TouchableOpacity,
  View,
} from 'react-native';
import RNBlobUtil from 'react-native-blob-util';

import AppText from '../../app/ui/AppText';
import { styles as reviewStyles } from '../../components/common/SeasonReviewControls';
import Feather from '../../components/icons/NuriFeatherIcon';

const PRESETS = ['default', '320', '360', '384', '412'] as const;
type Preset = (typeof PRESETS)[number];
const ORIGIN = 'http://127.0.0.1:56324';
const tokenPath = () =>
  `${RNBlobUtil.fs.dirs.DocumentDir}/.nuri-device-layout-qa`;

function isPreset(value: unknown): value is Preset {
  return PRESETS.some(preset => preset === value);
}

const label = (preset: Preset) =>
  preset === 'default' ? '기기 기본' : `${preset}dp`;

async function requestPreset(preset?: Preset): Promise<Preset | null> {
  const token = await RNBlobUtil.fs.readFile(tokenPath(), 'utf8');
  if (!/^[a-f0-9]{64}$/.test(token)) throw new Error('USB_LAYOUT_UNAVAILABLE');
  const response = await RNBlobUtil.config({
    timeout: 2500,
    followRedirect: false,
  }).fetch(
    preset ? 'POST' : 'GET',
    ORIGIN + (preset ? `/preset/${preset}` : '/status'),
    { Authorization: `Bearer ${token}` },
  );
  if (response.info().status !== 200) throw new Error('USB_LAYOUT_UNAVAILABLE');
  const result: unknown = response.json();
  if (typeof result !== 'object' || result === null || !('preset' in result)) {
    throw new Error('USB_LAYOUT_INVALID_RESULT');
  }
  if (result.preset === null || isPreset(result.preset)) return result.preset;
  throw new Error('USB_LAYOUT_INVALID_RESULT');
}

function UsbDeviceLayoutShelf() {
  const [expanded, setExpanded] = useState(false);
  const [selected, setSelected] = useState<Preset | null>(null);
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);
  const pending = useRef(false);
  const mounted = useRef(false);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  const update = async (preset?: Preset) => {
    if (pending.current) return;
    pending.current = true;
    setBusy(true);
    setFailed(false);
    try {
      const current = await requestPreset(preset);
      if (mounted.current) setSelected(current);
    } catch {
      if (mounted.current) {
        setSelected(null);
        setFailed(true);
      }
    } finally {
      pending.current = false;
      if (mounted.current) setBusy(false);
    }
  };

  const onRefresh = useRef(update);
  onRefresh.current = update;
  useEffect(() => {
    if (!expanded) return;
    const subscription = AppState.addEventListener('change', state => {
      if (state === 'active') onRefresh.current();
    });
    return () => subscription.remove();
  }, [expanded]);

  return (
    <View testID="usb-device-layout-controls" style={reviewStyles.shelf}>
      <View style={reviewStyles.segment}>
        <TouchableOpacity
          accessibilityRole="button"
          accessibilityState={{ expanded }}
          testID="usb-device-layout-toggle"
          style={reviewStyles.toggle}
          onPress={() => {
            setExpanded(!expanded);
            if (!expanded) update();
          }}
        >
          <AppText
            preset="unifiedLabel"
            styleOverridesPreset
            style={[
              reviewStyles.label,
              reviewStyles.toggleLabel,
              reviewStyles.selectedLabel,
            ]}
          >
            {selected ? `기기 화면 · ${label(selected)}` : '기기 화면 · USB QA'}
          </AppText>
          <Feather
            name={expanded ? 'chevron-up' : 'chevron-down'}
            size={14}
            color={reviewStyles.selectedLabel.color}
            accessible={false}
          />
        </TouchableOpacity>
        {expanded ? (
          <>
            <View style={styles.options}>
              {PRESETS.map(preset => (
                <TouchableOpacity
                  key={preset}
                  accessibilityRole="button"
                  accessibilityLabel={`${label(preset)} 화면으로 변경`}
                  accessibilityState={{
                    selected: selected === preset,
                    disabled: busy,
                  }}
                  testID={`usb-device-layout-${preset}`}
                  disabled={busy}
                  style={[
                    reviewStyles.option,
                    styles.option,
                    selected === preset && reviewStyles.selected,
                  ]}
                  onPress={() => {
                    update(preset);
                  }}
                >
                  <AppText
                    preset="unifiedLabel"
                    styleOverridesPreset
                    style={[
                      reviewStyles.label,
                      selected === preset && reviewStyles.selectedLabel,
                    ]}
                  >
                    {label(preset)}
                  </AppText>
                </TouchableOpacity>
              ))}
            </View>
            {failed ? (
              <AppText
                accessibilityLiveRegion="polite"
                preset="bodySm"
                style={styles.error}
              >
                USB 연결과 Mac의 화면 전환 도구를 확인해 주세요.
              </AppText>
            ) : null}
          </>
        ) : null}
      </View>
    </View>
  );
}

function UsbDeviceLayoutGate() {
  const [available, setAvailable] = useState(false);
  useEffect(() => {
    let alive = true;
    const check = async () => RNBlobUtil.fs.exists(tokenPath());
    check()
      .then(exists => {
        if (alive) setAvailable(exists);
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, []);
  return available ? <UsbDeviceLayoutShelf /> : null;
}

export default function UsbDeviceLayoutControls() {
  if (!__DEV__ || Platform.OS !== 'android') return null;
  return <UsbDeviceLayoutGate />;
}

const styles = StyleSheet.create({
  options: { flexDirection: 'row', flexWrap: 'wrap', marginTop: 3 },
  option: { flex: 0, flexBasis: '33.33%', minHeight: 44 },
  error: { paddingHorizontal: 8, paddingVertical: 6, color: '#972938' },
});
