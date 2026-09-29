import { useContext } from 'react';
import { SafeAreaInsetsContext } from 'react-native-safe-area-context';

const ZERO_INSETS = { top: 0, right: 0, bottom: 0, left: 0 } as const;

/**
 * Portaled overlays can be rendered in isolation by tests or native hosts.
 * Use the app provider when present and fall back to zero insets otherwise.
 */
export function useOptionalSafeAreaInsets() {
  return useContext(SafeAreaInsetsContext) ?? ZERO_INSETS;
}
