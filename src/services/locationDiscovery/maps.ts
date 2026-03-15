import { Linking, Platform } from 'react-native';

type MapPreviewInput = {
  latitude: number;
  longitude: number;
};

type ExternalMapInput = MapPreviewInput & {
  label: string;
};

export function buildStaticMapPreviewUrl(input: MapPreviewInput): string {
  const latitude = input.latitude.toFixed(6);
  const longitude = input.longitude.toFixed(6);

  return (
    'https://staticmap.openstreetmap.de/staticmap.php' +
    `?center=${latitude},${longitude}` +
    '&zoom=15' +
    '&size=800x420' +
    `&markers=${latitude},${longitude},red-pushpin`
  );
}

export function buildExternalMapUrl(input: ExternalMapInput): string {
  const encodedLabel = encodeURIComponent(input.label);

  if (Platform.OS === 'ios') {
    return `http://maps.apple.com/?ll=${input.latitude},${input.longitude}&q=${encodedLabel}`;
  }

  return `geo:${input.latitude},${input.longitude}?q=${input.latitude},${input.longitude}(${encodedLabel})`;
}

export async function openExternalMap(input: ExternalMapInput): Promise<void> {
  const primaryUrl = buildExternalMapUrl(input);
  const fallbackUrl =
    `https://map.kakao.com/link/map/${encodeURIComponent(input.label)},` +
    `${input.latitude},${input.longitude}`;

  const canOpenPrimary = await Linking.canOpenURL(primaryUrl);
  if (canOpenPrimary) {
    await Linking.openURL(primaryUrl);
    return;
  }

  await Linking.openURL(fallbackUrl);
}
