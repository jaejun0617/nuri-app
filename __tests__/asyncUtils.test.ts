import { createLatestRequestController } from '../src/services/app/async';
import { resolveSelectedPetId, type Pet } from '../src/store/petStore';

describe('async request controller', () => {
  it('가장 최근 요청만 current 로 유지한다', () => {
    const controller = createLatestRequestController();

    const first = controller.begin();
    const second = controller.begin();

    expect(controller.isCurrent(first)).toBe(false);
    expect(controller.isCurrent(second)).toBe(true);
  });

  it('cancel 이후에는 어떤 요청도 current 로 보지 않는다', () => {
    const controller = createLatestRequestController();
    const requestId = controller.begin();

    controller.cancel();

    expect(controller.isCurrent(requestId)).toBe(false);
  });
});

describe('resolveSelectedPetId', () => {
  const pets: Pet[] = [
    { id: 'pet-1', name: 'Nuri' },
    { id: 'pet-2', name: 'Momo' },
  ];

  it('유효한 preferred pet id 를 최우선으로 사용한다', () => {
    expect(resolveSelectedPetId(pets, 'pet-1', 'pet-2')).toBe('pet-2');
  });

  it('preferred 가 없으면 저장된 선택값을 사용한다', () => {
    expect(resolveSelectedPetId(pets, 'pet-2')).toBe('pet-2');
  });

  it('둘 다 없거나 유효하지 않으면 첫 pet 으로 fallback 한다', () => {
    expect(resolveSelectedPetId(pets, 'missing', 'also-missing')).toBe('pet-1');
    expect(resolveSelectedPetId([], null, null)).toBeNull();
  });
});
