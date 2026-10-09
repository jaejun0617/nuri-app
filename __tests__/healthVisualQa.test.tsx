import React from 'react';
import TestRenderer, { act } from 'react-test-renderer';
import {
  blockHealthVisualQaMutation,
  buildHealthVisualQaData,
  useHealthVisualQa,
  useHealthVisualQaStore,
} from '../src/components/health/healthVisualQa';
import HealthVisualQaControl from '../src/components/health/HealthVisualQaControl';

jest.mock('../src/store/uiStore', () => ({ showToast: jest.fn() }));

describe('session-only health visual QA', () => {
  const dev = __DEV__;
  afterEach(() => {
    Object.defineProperty(global, '__DEV__', {
      value: dev,
      writable: true,
      configurable: true,
    });
    useHealthVisualQaStore.getState().setEnabled(false);
  });

  it('provides dense sample lists with derived counts and no real identifiers', () => {
    const data = buildHealthVisualQaData('2020-02');
    expect(data.activityItems).toHaveLength(18);
    expect(data.weightTimeline).toHaveLength(8);
    expect(data.dateItems).toHaveLength(29);
    expect(data.groupedActivities[data.latestActivityYmd]).toHaveLength(6);
    expect(data.weightSummary.monthCount).toBe(8);
    expect(data.weightSummary.latestWeightKg).toBe(5.3);
    expect(
      data.activityItems.every(item => item.id.startsWith('health-visual-qa:')),
    ).toBe(true);
    expect(new Set(data.activityItems.map(item => item.ymd)).size).toBe(5);
    expect(
      data.weightLogs.every(log => log.petId === 'health-visual-qa-pet'),
    ).toBe(true);
  });

  it('blocks writing, notification changes and stale sample row actions', () => {
    expect(blockHealthVisualQaMutation('real-id')).toBe(false);
    useHealthVisualQaStore.getState().setEnabled(true);
    expect(blockHealthVisualQaMutation()).toBe(true);
    useHealthVisualQaStore.getState().setEnabled(false);
    expect(blockHealthVisualQaMutation('health-visual-qa:weight:1')).toBe(true);
    expect(blockHealthVisualQaMutation('real-id')).toBe(false);
  });

  it('does not enable the QA mode or expose its control in Release', async () => {
    Object.defineProperty(global, '__DEV__', {
      value: false,
      writable: true,
      configurable: true,
    });
    useHealthVisualQaStore.getState().setEnabled(true);
    expect(useHealthVisualQaStore.getState().enabled).toBe(false);
    let renderer: TestRenderer.ReactTestRenderer | undefined;
    await act(async () => {
      renderer = TestRenderer.create(<HealthVisualQaControl />);
    });
    expect(renderer?.toJSON()).toBeNull();
    await act(async () => renderer?.unmount());
  });

  it('returns to real-data ownership without caching or persisting samples', async () => {
    let current: ReturnType<typeof useHealthVisualQa> | undefined;
    function Probe() {
      current = useHealthVisualQa('2020-02');
      return null;
    }
    let renderer: TestRenderer.ReactTestRenderer | undefined;
    await act(async () => {
      renderer = TestRenderer.create(<Probe />);
    });
    expect(current?.data).toBeNull();
    await act(async () => useHealthVisualQaStore.getState().setEnabled(true));
    expect(current?.data?.activityItems).toHaveLength(18);
    await act(async () => useHealthVisualQaStore.getState().setEnabled(false));
    expect(current?.data).toBeNull();
    await act(async () => renderer?.unmount());
  });
});
