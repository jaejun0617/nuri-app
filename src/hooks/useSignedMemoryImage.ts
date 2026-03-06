// 파일: src/hooks/useSignedMemoryImage.ts
// 역할:
// - memory image storage path를 signed URL로 비동기 변환하는 공용 훅
// - 홈/타임라인/카드에서 동일한 로딩/에러 처리 규칙을 재사용하도록 통일
// - 같은 path에 대한 캐시 함수 호출을 공통화해 중복 effect 코드를 줄임

import { useEffect, useState } from 'react';

import { getMemoryImageSignedUrlCached } from '../services/supabase/storageMemories';

export function useSignedMemoryImage(imagePath: string | null | undefined) {
  const [signedUrl, setSignedUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let mounted = true;

    async function run() {
      const path = imagePath?.trim() ?? null;
      if (!path) {
        if (mounted) {
          setSignedUrl(null);
          setLoading(false);
        }
        return;
      }

      try {
        if (mounted) setLoading(true);
        const url = await getMemoryImageSignedUrlCached(path);
        if (mounted) setSignedUrl(url ?? null);
      } catch {
        if (mounted) setSignedUrl(null);
      } finally {
        if (mounted) setLoading(false);
      }
    }

    run();
    return () => {
      mounted = false;
    };
  }, [imagePath]);

  return { signedUrl, loading };
}
