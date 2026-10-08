import { useCallback } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { useQuery } from '@tanstack/react-query';
import { useAuthStore } from '../store/authStore';
import {
  fetchMonthlyExpenses,
  MONTHLY_EXPENSE_QUERY_KEY,
} from '../services/records/expenses';

export function useMonthlyExpenses(monthKey: string) {
  const userId = useAuthStore(state => state.session?.user.id ?? null);
  const query = useQuery({
    queryKey: [...MONTHLY_EXPENSE_QUERY_KEY, userId, monthKey],
    queryFn: ({ signal }) => {
      if (!userId) throw new Error('로그인이 필요해요.');
      return fetchMonthlyExpenses(userId, monthKey, signal);
    },
    enabled: Boolean(userId),
    staleTime: 60_000,
    refetchOnMount: 'always',
  });
  const { refetch } = query;
  useFocusEffect(
    useCallback(() => {
      if (userId) refetch();
    }, [refetch, userId]),
  );
  return query;
}
