import React, { useEffect, useMemo, useState } from 'react';
import { View } from 'react-native';
import WebView from 'react-native-webview';

import AppText from '../../app/ui/AppText';
import { buildInteractiveMapPreviewHtml } from '../../services/locationDiscovery/maps';
import { styles } from './LocationDiscovery.styles';

type Props = {
  latitude: number;
  longitude: number;
  title: string;
};

export default function LocationDiscoveryMapPreview({
  latitude,
  longitude,
  title,
}: Props) {
  const [isMapPreviewFailed, setIsMapPreviewFailed] = useState(false);
  const mapPreviewHtml = useMemo(
    () => buildInteractiveMapPreviewHtml({ latitude, longitude }),
    [latitude, longitude],
  );

  useEffect(() => {
    setIsMapPreviewFailed(false);
  }, [latitude, longitude]);

  return (
    <View style={styles.mapPreviewCard}>
      {isMapPreviewFailed ? (
        <View
          style={[
            styles.mapPreviewImage,
            {
              alignItems: 'center',
              justifyContent: 'center',
              paddingHorizontal: 20,
              backgroundColor: '#E6EDF5',
            },
          ]}
        >
          <AppText
            preset="body"
            style={{ color: '#102033', fontWeight: '900', textAlign: 'center' }}
          >
            지도 미리보기를 불러오지 못했어요
          </AppText>
          <AppText
            preset="caption"
            style={{
              marginTop: 8,
              color: '#607084',
              lineHeight: 18,
              textAlign: 'center',
            }}
          >
            위쪽 버튼으로 외부 지도를 열어 정확한 위치를 확인해 주세요.
          </AppText>
        </View>
      ) : (
        <WebView
          source={{ html: mapPreviewHtml }}
          originWhitelist={['*']}
          style={styles.mapPreviewImage}
          scrollEnabled
          nestedScrollEnabled
          javaScriptEnabled
          domStorageEnabled
          setSupportMultipleWindows={false}
          onError={() => {
            setIsMapPreviewFailed(true);
          }}
          onHttpError={() => {
            setIsMapPreviewFailed(true);
          }}
        />
      )}
      <View pointerEvents="none" style={styles.mapPreviewOverlay}>
        <AppText preset="caption" style={styles.mapPreviewLabel}>
          {title} · 한 손가락으로 이동하고 두 손가락으로 확대/축소할 수 있어요
        </AppText>
      </View>
    </View>
  );
}
