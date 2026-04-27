// 파일: src/hooks/usePrivateLetters.ts
// 파일 목적:
// - private letters 화면이 Supabase query/mutation 상태를 직접 조립하지 않도록 묶는다.
// 어디서 쓰이는지:
// - GuestbookScreen의 선택 펫 기준 편지 목록과 작성 mutation.

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import {
  createPrivateLetter,
  fetchPrivateLetters,
} from '../services/supabase/letters';

export const privateLettersQueryKey = (petId: string | null) => [
  'private-letters',
  petId ?? 'no-pet',
] as const;

export function usePrivateLetters(input: {
  petId: string | null;
  enabled: boolean;
}) {
  const queryClient = useQueryClient();
  const petId = input.petId?.trim() || null;

  const query = useQuery({
    queryKey: privateLettersQueryKey(petId),
    queryFn: () => fetchPrivateLetters({ petId: petId! }),
    enabled: input.enabled && Boolean(petId),
    staleTime: 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });

  const createMutation = useMutation({
    mutationFn: (content: string) => createPrivateLetter({ petId: petId!, content }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: privateLettersQueryKey(petId),
      });
    },
  });

  return {
    letters: query.data ?? [],
    loading: query.isLoading,
    refreshing: query.isRefetching,
    error: query.error instanceof Error ? query.error.message : null,
    refetch: query.refetch,
    createLetter: createMutation.mutateAsync,
    creating: createMutation.isPending,
    createError:
      createMutation.error instanceof Error ? createMutation.error.message : null,
  };
}
