import React, { useState } from 'react';
import { Button, View } from 'react-native';
import AppText from '../../../app/ui/AppText';
import { isWalkDistanceQaEnabled } from '../../../services/walk/runtime/distanceProjection';
import {
  startTimerTrace,
  stopTimerTrace,
  clearTimerTrace,
  type TimerScenario,
} from './timerTrace';

const scenarios: readonly TimerScenario[] = [
  'STATIC',
  'MAP',
  'PAUSE_RESUME',
  'APPSTATE',
  'FINAL_STATIC',
];

export default function WalkTimerTraceControls() {
  const [status, setStatus] = useState('READY');
  if (!isWalkDistanceQaEnabled()) return null;
  const exportTrace = async () => {
    const receipt = stopTimerTrace();
    if (!receipt) {
      setStatus('NOT_RECORDING');
      return;
    }
    setStatus('EXPORTING');
    try {
      // Existing file bridge, loaded only on explicit export. No tick writes or logs.
      const Blob: typeof import('react-native-blob-util').default =
        require('react-native-blob-util').default;
      const root = await Blob.android.getSDCardApplicationDir();
      if (!root) throw new Error('TIMER_TRACE_STORAGE_UNAVAILABLE');
      const file = `${root}/files/walk-timer-${receipt.scenario}-${Math.floor(
        receipt.startMonoMs,
      )}.json`;
      const text = JSON.stringify(receipt);
      await Blob.fs.writeFile(file, text, 'utf8');
      if ((await Blob.fs.readFile(file, 'utf8')) !== text)
        throw new Error('TIMER_TRACE_READBACK');
      setStatus(`EXPORTED_${receipt.scenario}`);
    } catch {
      setStatus('EXPORT_FAILED');
    }
  };
  return (
    <View testID="walk-timer-trace-controls">
      <AppText preset="bodySm" testID="walk-timer-trace-status">
        {status}
      </AppText>
      {scenarios.map(value => (
        <Button
          key={value}
          testID={`walk-timer-start-${value}`}
          title={`Timer ${value}`}
          onPress={() =>
            setStatus(
              startTimerTrace(value)
                ? `RECORDING_${value}`
                : 'ALREADY_RECORDING',
            )
          }
        />
      ))}
      <Button
        testID="walk-timer-export"
        title="Timer 기록 종료 및 내보내기"
        onPress={exportTrace}
      />
      <Button
        testID="walk-timer-clear"
        title="Timer 메모리 비우기"
        onPress={() => {
          clearTimerTrace();
          setStatus('CLEARED');
        }}
      />
    </View>
  );
}
