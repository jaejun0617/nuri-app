import {
  Alert as NativeAlert,
  Platform,
  type AlertButton,
  type AlertOptions,
} from 'react-native';

type AndroidAlert = {
  id: number;
  title: string;
  message: string;
  buttons: readonly AlertButton[];
  options?: AlertOptions;
};

let nextId = 0;
let pending: AndroidAlert | null = null;
const listeners = new Set<() => void>();

function publish(value: AndroidAlert | null) {
  pending = value;
  for (const listener of listeners) listener();
}

export const androidAlertState = {
  subscribe(listener: () => void) {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  },
  getSnapshot: () => pending,
  choose(id: number, index: number) {
    if (pending?.id !== id) return;
    const button = pending.buttons[index];
    if (!button) return;
    publish(null);
    button.onPress?.();
  },
  dismiss(id: number) {
    if (pending?.id !== id || !pending.options?.cancelable) return;
    const onDismiss = pending.options.onDismiss;
    publish(null);
    onDismiss?.();
  },
};

export const NuriAlert = {
  alert(
    title: string,
    message?: string,
    buttons?: AlertButton[],
    options?: AlertOptions,
  ) {
    if (Platform.OS !== 'android') {
      NativeAlert.alert(title, message, buttons, options);
      return;
    }
    const previous = pending;
    // Android's native Alert replaces the current dialog rather than queuing it.
    publish({
      id: ++nextId,
      title,
      message: message ?? '',
      buttons: buttons?.length
        ? buttons.slice(0, 3).map(button => ({ ...button }))
        : [{ text: '확인' }],
      options,
    });
    previous?.options?.onDismiss?.();
  },
};
