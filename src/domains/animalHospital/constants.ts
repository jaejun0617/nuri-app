export const ANIMAL_HOSPITAL_DOMAIN = 'animalHospital';

export const ANIMAL_HOSPITAL_PUBLIC_PHONE_STALE_DAYS = 30;
export const ANIMAL_HOSPITAL_STATUS_STALE_DAYS = 7;
export const ANIMAL_HOSPITAL_ADDRESS_STALE_DAYS = 30;
export const ANIMAL_HOSPITAL_COORDINATES_STALE_DAYS = 180;
export const ANIMAL_HOSPITAL_OPERATING_HOURS_STALE_DAYS = 14;
export const ANIMAL_HOSPITAL_BOOLEAN_SIGNAL_STALE_DAYS = 7;

export const ANIMAL_HOSPITAL_DEFAULT_NEARBY_QUERY = '동물병원';
export const ANIMAL_HOSPITAL_DEFAULT_RADIUS_METERS = 5000;
export const ANIMAL_HOSPITAL_DEFAULT_PAGE_SIZE = 15;

export const ANIMAL_HOSPITAL_HIDDEN_PUBLIC_FIELDS = [
  'operatingHours',
  'open24Hours',
  'nightService',
  'weekendService',
  'exoticAnimalCare',
  'emergencyCare',
  'parking',
  'equipmentSummary',
  'homepageUrl',
  'socialUrl',
] as const;

export const ANIMAL_HOSPITAL_PUBLIC_MVP_FIELDS = [
  'name',
  'address',
  'coordinates',
  'distance',
  'statusSummary',
  'officialPhone',
  'publicTrust',
  'links',
] as const;
