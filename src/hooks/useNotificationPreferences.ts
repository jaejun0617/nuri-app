import { useIsMutating, useMutation, useMutationState, useQuery, useQueryClient } from '@tanstack/react-query';

import { useAuthStore } from '../store/authStore';
import { supabase } from '../services/supabase/client';
import { syncPushNotificationDevice } from '../services/notifications/pushTokenLifecycle';
import { reconcileScheduleNotificationPreference } from '../services/schedules/preferenceSync';

export type NotificationPreferenceKey = 'service' | 'community' | 'schedule' | 'activity' | 'record' | 'anniversary' | 'memorial';
export type NotificationPreferences = { pushOptIn: boolean; categories: Partial<Record<NotificationPreferenceKey, boolean>> };
const keys: readonly string[] = ['service', 'community', 'schedule', 'activity', 'record', 'anniversary', 'memorial'];

function parsePreferences(raw: unknown): NotificationPreferences {
  if (!raw || typeof raw !== 'object' || !('pushOptIn' in raw) || typeof raw.pushOptIn !== 'boolean' || !('categories' in raw) || !raw.categories || typeof raw.categories !== 'object' || Array.isArray(raw.categories))
    throw new Error('NURI_NOTIFICATION_SETTINGS_INVALID');
  const entries = Object.entries(raw.categories);
  if (entries.some(([key, value]) => !keys.includes(key) || typeof value !== 'boolean')) throw new Error('NURI_NOTIFICATION_SETTINGS_INVALID');
  return { pushOptIn: raw.pushOptIn, categories: Object.fromEntries(entries) };
}

export function useNotificationPreferences() {
  const owner = useAuthStore(s => s.session?.user.id ?? null);
  const client = useQueryClient();
  const queryKey = ['notifications-v3', owner, 'preferences'];
  const mutationKey = ['notifications-v3', owner, 'preferences-write'];
  const current = () => {
    if (!owner || useAuthStore.getState().session?.user.id !== owner) throw new Error('NURI_NOTIFICATION_ACCOUNT_CHANGED');
  };
  const query = useQuery({
    queryKey, enabled: Boolean(owner), staleTime: 15_000, refetchOnMount: 'always',
    queryFn: async () => {
      current();
      const result = await supabase.rpc('manage_user_notification_preferences_v3');
      if (result.error) throw result.error;
      current();
      return parsePreferences(result.data);
    },
  });
  const mutation = useMutation({
    mutationKey, scope: { id: `notification-preferences:${owner}` },
    onMutate: async () => {
      await client.cancelQueries({ queryKey, exact: true });
      current();
    },
    mutationFn: async ({ name, value }: { name: NotificationPreferenceKey; value: boolean }) => {
      current();
      const result = await supabase.rpc('manage_user_notification_preferences_v3', { p_categories: { [name]: value } });
      if (result.error) throw result.error;
      current();
      return parsePreferences(result.data);
    },
    onSuccess: async (data, variables) => {
      if (useAuthStore.getState().session?.user.id !== owner) return;
      client.setQueryData(queryKey, data);
      if (variables.name === 'schedule' && owner)
        await reconcileScheduleNotificationPreference(owner, variables.value);
      // Registration uses confirmed account consent and actual OS permission.
      syncPushNotificationDevice().catch(() => {});
    },
  });
  const changing = useIsMutating({ mutationKey }) > 0;
  const pending = useMutationState({
    filters: { mutationKey, status: 'pending' },
    select: item => {
      const value: unknown = item.state.variables;
      return value && typeof value === 'object' && 'name' in value && typeof value.name === 'string' && keys.includes(value.name) && 'value' in value && typeof value.value === 'boolean'
        ? { name: value.name, value: value.value } : null;
    },
  });
  // Duplicate service controls share a provisional value without duplicating
  // server state. Removing a failed mutation naturally restores confirmed data.
  const displayedCategories = { ...query.data?.categories };
  for (const item of pending) {
    if (item && keys.includes(item.name)) Object.assign(displayedCategories, { [item.name]: item.value });
  }
  const update = async (name: NotificationPreferenceKey, value: boolean) => {
    current();
    if (client.isMutating({ mutationKey })) throw new Error('NURI_NOTIFICATION_SETTINGS_BUSY');
    return mutation.mutateAsync({ name, value });
  };
  return { query, changing, update, displayedCategories };
}
