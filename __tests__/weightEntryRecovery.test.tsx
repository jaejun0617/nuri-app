import React from 'react';
import { Alert, Modal } from 'react-native';
import Renderer, { act } from 'react-test-renderer';
import { ThemeProvider } from 'styled-components/native';
import { createTheme } from '../src/app/theme/theme';
import WeightLogEntrySheet from '../src/components/health/WeightLogEntrySheet';
import {
  deletePetWeightLog,
  upsertPetWeightLog,
  type PetWeightLogMutationResult,
} from '../src/services/supabase/petWeightLogs';
import { showToast } from '../src/store/uiStore';

type State = { session: { user: { id: string } } | null };
let mockState: State = { session: { user: { id: 'A' } } };
const mockListeners = new Set<(next: State, previous: State) => void>();
jest.mock('../src/store/authStore', () => ({
  useAuthStore: {
    getState: () => mockState,
    subscribe: (listener: (next: State, previous: State) => void) => {
      mockListeners.add(listener);
      return () => mockListeners.delete(listener);
    },
  },
}));
jest.mock('../src/services/supabase/petWeightLogs', () => ({
  upsertPetWeightLog: jest.fn(),
  deletePetWeightLog: jest.fn(),
}));
jest.mock('../src/store/uiStore', () => ({ showToast: jest.fn() }));
jest.mock('../src/app/ui/AppText', () => 'AppText');
jest.mock('../src/app/ui/AppTextInput', () => 'AppTextInput');
jest.mock('../src/components/date-picker/DatePickerModal', () => () => null);
jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 24, bottom: 24, left: 0, right: 0 }),
}));

const log = {
  id: 'log',
  petId: 'pet',
  userId: 'A',
  measuredOn: '2026-10-29',
  weightKg: 6.2,
  note: null,
  source: 'health_report' as const,
  createdAt: '2026-10-29T01:00:00Z',
  updatedAt: '2026-10-29T01:00:00Z',
};
const saved: PetWeightLogMutationResult = {
  action: 'upsert',
  changedLog: log,
  latestSnapshot: {
    latestLogId: log.id,
    latestMeasuredOn: log.measuredOn,
    latestWeightKg: log.weightKg,
  },
};
function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (error: Error) => void;
  const promise = new Promise<T>((yes, no) => {
    resolve = yes;
    reject = no;
  });
  return { promise, resolve, reject };
}
function owner(id: string) {
  const previous = mockState;
  mockState = { session: { user: { id } } };
  mockListeners.forEach(listener => listener(mockState, previous));
}
let renderer: Renderer.ReactTestRenderer | undefined;
function tree() {
  if (!renderer) throw new Error('Weight entry is not mounted');
  return renderer;
}
const close = jest.fn();
const committed = jest.fn();
const baseProps = {
  visible: true,
  petId: 'pet',
  petName: 'Nuri',
  accentColor: '#E45A58',
  entrySource: 'health_report' as const,
  initialWeightKg: 6.2,
  initialMeasuredOn: '2026-10-29',
  onClose: close,
  onCommitted: committed,
};
async function render(
  props: Partial<React.ComponentProps<typeof WeightLogEntrySheet>> = {},
) {
  const element = (
    <ThemeProvider theme={createTheme('light')}>
      <WeightLogEntrySheet {...baseProps} {...props} />
    </ThemeProvider>
  );
  await act(async () => {
    if (renderer) renderer.update(element);
    else renderer = Renderer.create(element);
  });
}
function save(): Promise<void> {
  return tree()
    .root.findByProps({ testID: 'weight-entry-save' })
    .props.onPress();
}
beforeEach(async () => {
  jest.clearAllMocks();
  mockState = { session: { user: { id: 'A' } } };
  jest.spyOn(Alert, 'alert').mockImplementation(() => {});
  jest.mocked(upsertPetWeightLog).mockResolvedValue(saved);
  jest
    .mocked(deletePetWeightLog)
    .mockResolvedValue({ ...saved, action: 'delete' });
  await render();
});
afterEach(async () => {
  await act(async () => renderer?.unmount());
  renderer = undefined;
  jest.restoreAllMocks();
  expect(mockListeners.size).toBe(0);
});

it('locks same-tick duplicate saves and keeps a failed entry editable for retry', async () => {
  jest.mocked(upsertPetWeightLog).mockRejectedValueOnce(new Error('offline'));
  await act(async () => {
    await Promise.all([save(), save()]);
  });
  expect(upsertPetWeightLog).toHaveBeenCalledTimes(1);
  expect(committed).not.toHaveBeenCalled();
  expect(close).not.toHaveBeenCalled();
  expect(
    tree().root.findByProps({ testID: 'weight-entry-value' }).props.value,
  ).toBe('6.2');
  expect(
    tree().root.findByProps({ testID: 'weight-entry-save' }).props.disabled,
  ).toBe(false);
  await act(async () => save());
  expect(upsertPetWeightLog).toHaveBeenCalledTimes(2);
  expect(committed).toHaveBeenCalledWith(saved);
  expect(close).toHaveBeenCalledTimes(1);
});

it.each(['pet', 'hidden', 'unmount', 'owner'] as const)(
  'ignores a late save result after %s changes',
  async change => {
    const pending = deferred<PetWeightLogMutationResult>();
    jest.mocked(upsertPetWeightLog).mockReturnValueOnce(pending.promise);
    let saving!: Promise<void>;
    act(() => {
      saving = save();
    });
    if (change === 'pet') await render({ petId: 'other', initialWeightKg: 4 });
    if (change === 'hidden') {
      await render({ visible: false });
      await render();
    }
    if (change === 'unmount') await act(async () => tree().unmount());
    if (change === 'owner') {
      owner('B');
      owner('A');
    }
    await act(async () => {
      pending.resolve(saved);
      await saving;
    });
    expect(committed).not.toHaveBeenCalled();
    expect(close).not.toHaveBeenCalled();
    expect(showToast).not.toHaveBeenCalled();
    expect(Alert.alert).not.toHaveBeenCalled();
    if (change !== 'unmount')
      expect(
        tree().root.findByProps({ testID: 'weight-entry-save' }).props.disabled,
      ).toBe(false);
  },
);

it('ignores a late save error after Android Back closes the entry', async () => {
  const pending = deferred<PetWeightLogMutationResult>();
  jest.mocked(upsertPetWeightLog).mockReturnValueOnce(pending.promise);
  let saving!: Promise<void>;
  act(() => {
    saving = save();
    tree().root.findByType(Modal).props.onRequestClose();
  });
  expect(close).toHaveBeenCalledTimes(1);
  await act(async () => {
    pending.reject(new Error('late offline'));
    await saving;
  });
  expect(Alert.alert).not.toHaveBeenCalled();
  expect(committed).not.toHaveBeenCalled();
});

it('rejects an old delete confirmation after the pet changes', async () => {
  await render({ initialLog: log });
  act(() =>
    tree().root.findByProps({ role: 'destructiveEntry' }).props.onPress(),
  );
  const confirm = jest
    .mocked(Alert.alert)
    .mock.calls.at(-1)?.[2]
    ?.find(button => button.style === 'destructive')?.onPress;
  expect(confirm).toBeDefined();
  await render({ petId: 'other', initialLog: null });
  await act(async () => {
    await confirm?.();
  });
  expect(deletePetWeightLog).not.toHaveBeenCalled();
  expect(close).not.toHaveBeenCalled();
});

it('keeps a new pet save locked when the previous pet response arrives', async () => {
  const previous = deferred<PetWeightLogMutationResult>();
  const next = deferred<PetWeightLogMutationResult>();
  jest
    .mocked(upsertPetWeightLog)
    .mockReturnValueOnce(previous.promise)
    .mockReturnValueOnce(next.promise);
  let oldSave!: Promise<void>;
  let newSave!: Promise<void>;
  act(() => {
    oldSave = save();
  });
  await render({ petId: 'other', initialWeightKg: 4 });
  act(() => {
    newSave = save();
  });
  await act(async () => {
    previous.resolve(saved);
    await oldSave;
  });
  expect(committed).not.toHaveBeenCalled();
  expect(
    tree().root.findByProps({ testID: 'weight-entry-save' }).props.disabled,
  ).toBe(true);
  const otherSaved = {
    ...saved,
    changedLog: { ...log, petId: 'other', weightKg: 4 },
  };
  await act(async () => {
    next.resolve(otherSaved);
    await newSave;
  });
  expect(committed).toHaveBeenCalledTimes(1);
  expect(committed).toHaveBeenCalledWith(otherSaved);
});

it('locks delete confirmation and ignores its late response after an owner round trip', async () => {
  await render({ initialLog: log });
  act(() =>
    tree().root.findByProps({ role: 'destructiveEntry' }).props.onPress(),
  );
  const confirm = jest
    .mocked(Alert.alert)
    .mock.calls.at(-1)?.[2]
    ?.find(button => button.style === 'destructive')?.onPress;
  if (!confirm) throw new Error('Delete confirmation was not shown');
  const pending = deferred<PetWeightLogMutationResult>();
  jest.mocked(deletePetWeightLog).mockReturnValueOnce(pending.promise);
  let deleting: unknown;
  act(() => {
    deleting = confirm();
    confirm();
  });
  expect(deletePetWeightLog).toHaveBeenCalledTimes(1);
  await act(async () => save());
  expect(upsertPetWeightLog).not.toHaveBeenCalled();
  owner('B');
  owner('A');
  await act(async () => {
    pending.resolve({ ...saved, action: 'delete' });
    await deleting;
  });
  expect(committed).not.toHaveBeenCalled();
  expect(close).not.toHaveBeenCalled();
  expect(showToast).not.toHaveBeenCalled();
  expect(
    tree().root.findByProps({ testID: 'weight-entry-save' }).props.disabled,
  ).toBe(false);
});
