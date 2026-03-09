// 파일: src/hooks/useSignedMemoryImage.ts
// 역할:
// - memory image storage path를 signed URL로 비동기 변환하는 공용 훅
// - 홈/타임라인/카드에서 동일한 로딩/에러 처리 규칙을 재사용하도록 통일
// - 같은 path에 대한 캐시 함수 호출을 공통화해 중복 effect 코드를 줄임

import { useEffect, useState } from 'react';

import { createLatestRequestController } from '../services/app/async';
import { getPrimaryMemoryImageRef } from '../services/records/imageSources';
import { getMemoryImageSignedUrlCached } from '../services/supabase/storageMemories';

export function useSignedMemoryImage(imagePath: string | null | undefined) {
  const [signedUrl, setSignedUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const imageRef = getPrimaryMemoryImageRef({
    imagePath,
    imagePaths: [],
    imageUrl: null,
  });

  useEffect(() => {
    const request = createLatestRequestController();

    async function run() {
      const requestId = request.begin();
      const path = imageRef?.trim() ?? null;
      if (!path) {
        if (request.isCurrent(requestId)) {
          setSignedUrl(null);
          setLoading(false);
        }
        return;
      }

      try {
        if (request.isCurrent(requestId)) setLoading(true);
        const url = await getMemoryImageSignedUrlCached(path);
        if (request.isCurrent(requestId)) setSignedUrl(url ?? null);
      } catch {
        if (request.isCurrent(requestId)) setSignedUrl(null);
      } finally {
        if (request.isCurrent(requestId)) setLoading(false);
      }
    }

    run();
    return () => {
      request.cancel();
    };
  }, [imageRef]);

  return { signedUrl, loading };
}
