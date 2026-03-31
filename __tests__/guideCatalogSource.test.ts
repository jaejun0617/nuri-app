describe('guide catalog source of truth', () => {
  const globalWithDev = globalThis as typeof globalThis & { __DEV__?: boolean };
  const originalDev = globalWithDev.__DEV__;

  afterEach(() => {
    Object.defineProperty(globalWithDev, '__DEV__', {
      configurable: true,
      value: originalDev,
      writable: true,
    });
    jest.resetModules();
    jest.clearAllMocks();
    jest.dontMock('../src/services/supabase/guides');
  });

  function loadGuideService(params: {
    isDev: boolean;
    fetchCatalogImpl: () => Promise<unknown>;
    fetchDetailImpl?: () => Promise<unknown>;
  }) {
    jest.resetModules();
    Object.defineProperty(globalWithDev, '__DEV__', {
      configurable: true,
      value: params.isDev,
      writable: true,
    });

    const fetchPublishedPetCareGuideCatalog = jest.fn(params.fetchCatalogImpl);
    const fetchPublishedPetCareGuideDetail = jest.fn(
      params.fetchDetailImpl ?? (() => Promise.resolve(null)),
    );

    jest.doMock('../src/services/supabase/guides', () => ({
      fetchManagedPetCareGuideCatalog: jest.fn(),
      fetchManagedPetCareGuideDetail: jest.fn(),
      fetchPopularPetCareGuideSearchesRpc: jest.fn(),
      fetchPublishedPetCareGuideCatalog,
      fetchPublishedPetCareGuideDetail,
      insertPetCareGuideEvents: jest.fn(),
      searchPublishedPetCareGuidesRpc: jest.fn(),
      upsertManagedPetCareGuide: jest.fn(),
    }));

    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const service = require('../src/services/guides/service') as typeof import('../src/services/guides/service');
    return {
      service,
    };
  }

  it('운영 빌드에서는 remote empty를 local seed로 대체하지 않는다', async () => {
    const { service } = loadGuideService({
      isDev: false,
      fetchCatalogImpl: async () => [],
    });

    const result = await service.fetchPetCareGuideCatalogResult();

    expect(result.source).toBe('remote-empty');
    expect(result.reason).toBe('empty-success');
    expect(result.guides).toEqual([]);
  });

  it('개발 빌드에서는 remote empty일 때 local seed fallback을 유지한다', async () => {
    const { service } = loadGuideService({
      isDev: true,
      fetchCatalogImpl: async () => [],
    });

    const result = await service.fetchPetCareGuideCatalogResult();

    expect(result.source).toBe('local-seed');
    expect(result.guides.length).toBeGreaterThan(0);
  });

  it('운영 빌드에서는 detail 조회 실패를 seed detail로 숨기지 않는다', async () => {
    const { service } = loadGuideService({
      isDev: false,
      fetchCatalogImpl: async () => [],
      fetchDetailImpl: async () => {
        throw new Error('remote-error');
      },
    });

    const result = await service.getPetCareGuideById('guide-common-water-routine');

    expect(result).toBeNull();
  });
});
