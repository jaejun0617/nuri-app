// 파일: src/services/records/metadata.ts
// 목적:
// - 기록 작성 화면과 홈 요약이 공유하는 구조화 metadata 계약을 관리한다.
// - 기존 title/content/tags 문자열 계약을 깨뜨리지 않고 카테고리별 입력값을 보존한다.

export type MealFoodType = 'dry_food' | 'wet_food' | 'treat' | 'water' | 'other';

export type HealthCondition =
  | 'very_good'
  | 'good'
  | 'normal'
  | 'needs_attention';

export type GroomingCareType =
  | 'bath'
  | 'coat_care'
  | 'nail_trim'
  | 'ear_cleaning'
  | 'tooth_brushing'
  | 'full_grooming';

export type MealRecordMetadata = {
  foodType: MealFoodType;
  amountGrams: number | null;
};

export type HealthRecordMetadata = {
  condition: HealthCondition | null;
  weightKg: number | null;
};

export type GroomingRecordMetadata = {
  careTypes: GroomingCareType[];
};

export type MemoryRecordMetadata = {
  version: 1;
  meal?: MealRecordMetadata;
  health?: HealthRecordMetadata;
  grooming?: GroomingRecordMetadata;
};

export const HEALTH_CONDITION_OPTIONS: ReadonlyArray<{
  value: HealthCondition;
  label: string;
}> = [
  { value: 'very_good', label: '매우 좋아요' },
  { value: 'good', label: '좋아요' },
  { value: 'normal', label: '보통이에요' },
  { value: 'needs_attention', label: '지켜봐야 해요' },
];

export const GROOMING_CARE_OPTIONS: ReadonlyArray<{
  value: GroomingCareType;
  label: string;
}> = [
  { value: 'bath', label: '목욕' },
  { value: 'coat_care', label: '털 정리' },
  { value: 'nail_trim', label: '발톱 정리' },
  { value: 'ear_cleaning', label: '귀 청소' },
  { value: 'tooth_brushing', label: '양치' },
  { value: 'full_grooming', label: '전체 미용' },
];

const MEAL_FOOD_TYPES: ReadonlyArray<MealFoodType> = [
  'dry_food',
  'wet_food',
  'treat',
  'water',
  'other',
];
const HEALTH_CONDITIONS: ReadonlyArray<HealthCondition> = [
  'very_good',
  'good',
  'normal',
  'needs_attention',
];
const GROOMING_CARE_TYPES: ReadonlyArray<GroomingCareType> = [
  'bath',
  'coat_care',
  'nail_trim',
  'ear_cleaning',
  'tooth_brushing',
  'full_grooming',
];

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function toPositiveNumberOrNull(value: unknown): number | null {
  const parsed = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) return null;
  return parsed;
}

function toMealMetadata(value: unknown): MealRecordMetadata | undefined {
  if (!isObject(value)) return undefined;
  const foodType = MEAL_FOOD_TYPES.includes(value.foodType as MealFoodType)
    ? (value.foodType as MealFoodType)
    : null;
  if (!foodType) return undefined;
  return {
    foodType,
    amountGrams: toPositiveNumberOrNull(value.amountGrams),
  };
}

function toHealthMetadata(value: unknown): HealthRecordMetadata | undefined {
  if (!isObject(value)) return undefined;
  const condition = HEALTH_CONDITIONS.includes(
    value.condition as HealthCondition,
  )
    ? (value.condition as HealthCondition)
    : null;
  const weightKg = toPositiveNumberOrNull(value.weightKg);
  if (!condition && weightKg === null) return undefined;
  return { condition, weightKg };
}

function toGroomingMetadata(
  value: unknown,
): GroomingRecordMetadata | undefined {
  if (!isObject(value) || !Array.isArray(value.careTypes)) return undefined;
  const careTypes = value.careTypes.filter(
    (item): item is GroomingCareType =>
      GROOMING_CARE_TYPES.includes(item as GroomingCareType),
  );
  if (careTypes.length === 0) return undefined;
  return { careTypes: Array.from(new Set(careTypes)) };
}

export function normalizeMemoryRecordMetadata(
  value: unknown,
): MemoryRecordMetadata | null {
  if (!isObject(value)) return null;

  const meal = toMealMetadata(value.meal);
  const health = toHealthMetadata(value.health);
  const grooming = toGroomingMetadata(value.grooming);
  if (!meal && !health && !grooming) return null;

  return {
    version: 1,
    ...(meal ? { meal } : {}),
    ...(health ? { health } : {}),
    ...(grooming ? { grooming } : {}),
  };
}

export function buildMealRecordMetadata(input: {
  amountGrams: number;
  foodType?: MealFoodType;
}): MemoryRecordMetadata {
  return {
    version: 1,
    meal: {
      foodType: input.foodType ?? 'dry_food',
      amountGrams: input.amountGrams,
    },
  };
}

export function buildHealthRecordMetadata(input: {
  condition: HealthCondition;
  weightKg: number | null;
}): MemoryRecordMetadata {
  return {
    version: 1,
    health: {
      condition: input.condition,
      weightKg: input.weightKg,
    },
  };
}

export function buildGroomingRecordMetadata(
  careTypes: GroomingCareType[],
): MemoryRecordMetadata {
  return {
    version: 1,
    grooming: {
      careTypes: Array.from(new Set(careTypes)),
    },
  };
}
