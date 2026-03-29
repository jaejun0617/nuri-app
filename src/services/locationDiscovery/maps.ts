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

export function buildInteractiveMapPreviewHtml(input: MapPreviewInput): string {
  const latitude = Number(input.latitude.toFixed(6));
  const longitude = Number(input.longitude.toFixed(6));

  return `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta
      name="viewport"
      content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no"
    />
    <link
      rel="stylesheet"
      href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"
      integrity="sha256-p4NxAoJBhIIN+hmNHrzRCf9tD/miZyoHS5obTRR9BMY="
      crossorigin=""
    />
    <style>
      html, body {
        margin: 0;
        padding: 0;
        width: 100%;
        height: 100%;
        overflow: hidden;
        background: #dce7f6;
      }
      #map {
        width: 100%;
        height: 100%;
        background: #dce7f6;
      }
      .leaflet-container {
        width: 100%;
        height: 100%;
        background: linear-gradient(180deg, #e7eef7 0%, #d6e0ee 100%);
        font-family: -apple-system, BlinkMacSystemFont, 'Apple SD Gothic Neo',
          'Noto Sans KR', sans-serif;
      }
      .leaflet-control-attribution {
        font-size: 10px;
        background: rgba(255, 255, 255, 0.88);
      }
      .center-marker {
        position: absolute;
        left: 50%;
        top: 50%;
        width: 24px;
        height: 24px;
        transform: translate(-50%, -100%) rotate(-45deg);
        border-radius: 999px 999px 999px 0;
        background: #e2552f;
        box-shadow: 0 8px 18px rgba(16, 32, 51, 0.22);
        pointer-events: none;
        z-index: 999;
      }
      .center-marker::after {
        content: '';
        position: absolute;
        left: 50%;
        top: 50%;
        width: 8px;
        height: 8px;
        border-radius: 999px;
        background: #ffffff;
        transform: translate(-50%, -50%) rotate(45deg);
      }
      .map-fade {
        position: absolute;
        inset: 0;
        pointer-events: none;
        background: linear-gradient(
          180deg,
          rgba(255,255,255,0.06) 0%,
          rgba(255,255,255,0) 36%,
          rgba(16,32,51,0.05) 100%
        );
        z-index: 998;
      }
    </style>
  </head>
  <body>
    <div id="map"></div>
    <div class="center-marker"></div>
    <div class="map-fade"></div>
    <script
      src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"
      integrity="sha256-20nQCchB9co0qIjJZRGuk2/Z9VM+kNiyxNV1lvTlZBo="
      crossorigin=""
    ></script>
    <script>
      (function () {
        var map = L.map('map', {
          zoomControl: false,
          attributionControl: true,
          dragging: true,
          touchZoom: true,
          doubleClickZoom: true,
          boxZoom: false,
          keyboard: false,
          tap: true,
          scrollWheelZoom: false,
        });

        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          maxZoom: 19,
          subdomains: ['a', 'b', 'c'],
          attribution: '&copy; OpenStreetMap contributors',
        }).addTo(map);

        map.setView([${latitude}, ${longitude}], 15);
      })();
    </script>
  </body>
</html>`;
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
