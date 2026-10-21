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
  | 'full_grooming'
  | 'partial_grooming'
  | 'sanitary_trim'
  | 'scissor_cut'
  | 'clipper_cut'
  | 'sporting_cut'
  | 'face_trim'
  | 'paw_pad_trim'
  | 'drying'
  | 'brushing'
  | 'conditioning'
  | 'anal_gland_care'
  | 'spa'
  | 'mud_pack';

export type MealRecordMetadata = {
  foodType: MealFoodType;
  amountGrams: number | null;
};

export type HealthRecordMetadata = {
  condition: HealthCondition | null;
  weightKg: number | null;
  care?: HealthCareDetails;
};

export type HealthCareKind = 'condition' | 'hospital' | 'medicine';
export type HealthCareDetails = {
  kind: HealthCareKind;
  hospitalName: string;
  diagnosis: string;
  medication: string;
};

export function emptyHealthCareDetails(kind: HealthCareKind = 'condition'): HealthCareDetails {
  return { kind, hospitalName: '', diagnosis: '', medication: '' };
}

export function normalizeHealthCareDetails(value: unknown): HealthCareDetails | undefined {
  if (!isObject(value)) return undefined;
  const kind = value.kind;
  if (kind !== 'condition' && kind !== 'hospital' && kind !== 'medicine') return undefined;
  const text = (key: string, limit: number) => typeof value[key] === 'string' ? value[key].trim().slice(0, limit) : '';
  return { kind, hospitalName: text('hospitalName', 100), diagnosis: text('diagnosis', 240), medication: text('medication', 240) };
}

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
  { value: 'partial_grooming', label: '부분 미용' },
  { value: 'sanitary_trim', label: '위생 미용' },
  { value: 'scissor_cut', label: '가위컷' },
  { value: 'clipper_cut', label: '클리핑' },
  { value: 'sporting_cut', label: '스포팅' },
  { value: 'face_trim', label: '얼굴 미용' },
  { value: 'paw_pad_trim', label: '발바닥 털 정리' },
  { value: 'drying', label: '드라이' },
  { value: 'brushing', label: '빗질' },
  { value: 'conditioning', label: '보습·컨디셔닝' },
  { value: 'anal_gland_care', label: '항문낭 관리' },
  { value: 'spa', label: '스파' },
  { value: 'mud_pack', label: '머드팩' },
];

export type RecordCareCategory = 'grooming' | 'bathing';
const CARE_CATEGORY_CODES: Record<RecordCareCategory, readonly GroomingCareType[]> = {
  // Existing codes/categories remain stable; salon and hygiene services can be recorded separately.
  grooming: ['full_grooming', 'partial_grooming', 'sanitary_trim', 'scissor_cut', 'clipper_cut', 'sporting_cut', 'face_trim', 'paw_pad_trim', 'nail_trim', 'coat_care'],
  bathing: ['bath', 'drying', 'brushing', 'conditioning', 'spa', 'mud_pack', 'tooth_brushing', 'ear_cleaning', 'anal_gland_care'],
};

export function isRecordCareCategory(main: string | null, sub: string | null): sub is RecordCareCategory {
  return main === 'other' && (sub === 'grooming' || sub === 'bathing');
}

/** Keep legacy/Home copy stable while the bathing composer names the standalone shampoo service. */
export function getRecordCareLabel(code: GroomingCareType, category: RecordCareCategory) {
  if (category === 'bathing' && code === 'bath') return '샴푸·목욕';
  return GROOMING_CARE_OPTIONS.find(option => option.value === code)?.label;
}

/** New choices are explicit codes; existing records can still expose their legacy choices. */
export function getRecordCareOptions(category: RecordCareCategory, legacy: readonly GroomingCareType[] = []) {
  const codes = [...new Set([...CARE_CATEGORY_CODES[category], ...legacy])];
  return codes.flatMap(code => {
    const label = getRecordCareLabel(code, category);
    return label ? [{ value: code, label }] : [];
  });
}

export function filterRecordCareTypes(category: RecordCareCategory, values: readonly GroomingCareType[]) {
  return [...new Set(values)].filter(value => CARE_CATEGORY_CODES[category].includes(value));
}

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
const GROOMING_CARE_TYPES = new Set(GROOMING_CARE_OPTIONS.map(option => option.value));

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
  const care = normalizeHealthCareDetails(value.care);
  if (!condition && weightKg === null && !care) return undefined;
  return { condition, weightKg, ...(care ? { care } : {}) };
}

function toGroomingMetadata(
  value: unknown,
): GroomingRecordMetadata | undefined {
  if (!isObject(value) || !Array.isArray(value.careTypes)) return undefined;
  const careTypes = value.careTypes.filter(
    (item): item is GroomingCareType =>
      GROOMING_CARE_TYPES.has(item as GroomingCareType),
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
  condition: HealthCondition | null;
  weightKg: number | null;
  care?: HealthCareDetails;
}): MemoryRecordMetadata {
  return {
    version: 1,
    health: {
      condition: input.condition,
      weightKg: input.weightKg,
      ...(input.care ? { care: normalizeHealthCareDetails(input.care) } : {}),
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
