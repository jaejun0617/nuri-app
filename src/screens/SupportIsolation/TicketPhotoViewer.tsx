import React, { useEffect, useRef, useState } from 'react';
import { Image, StyleSheet, View } from 'react-native';
import ConfirmDialog from '../../components/common/ConfirmDialog';
import CtaButton, { CtaText } from '../../app/ui/CtaButton';
import Feather from '../../components/icons/NuriFeatherIcon';
import { Copy } from '../Support/PreviewPrimitives';
import {
  NoticeError,
  type IsolatedNoticeClient,
  type TicketPhoto,
} from './isolatedNoticeClient';

export default function TicketPhotoViewer({
  photo,
  client,
  onDenied,
}: {
  photo: TicketPhoto;
  client: IsolatedNoticeClient;
  onDenied: (reason: unknown) => void;
}) {
  const [open, setOpen] = useState(false);
  const [uri, setUri] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);
  const generation = useRef(0);
  useEffect(
    () => () => {
      generation.current++;
    },
    [],
  );

  async function load() {
    const request = ++generation.current;
    setOpen(true);
    setFailed(false);
    setUri(null);
    try {
      const source = await client.readTicketPhoto(photo.id);
      if (request === generation.current) setUri(source);
    } catch (error) {
      if (request !== generation.current) return;
      if (
        error instanceof NoticeError &&
        [
          'SUPPORT_NOT_FOUND',
          'SUPPORT_FORBIDDEN',
          'AUTH_REQUIRED',
          'SUPPORT_AUTH_REQUIRED',
        ].includes(error.code)
      ) {
        setOpen(false);
        onDenied(error);
        return;
      }
      setFailed(true);
    }
  }
  function close() {
    generation.current++;
    setOpen(false);
    setUri(null);
  }
  return (
    <>
      <CtaButton
        role="neutral"
        accessibilityLabel="첨부 사진 열기"
        testID={`ticket-photo-${photo.id}`}
        style={styles.open}
        onPress={load}
      >
        {palette => (
          <View style={styles.label}>
            <Feather
              name="image"
              size={18}
              color={palette.text}
              accessible={false}
            />
            <CtaText>첨부 사진</CtaText>
          </View>
        )}
      </CtaButton>
      {open ? (
        <ConfirmDialog
          visible
          title="첨부 사진"
          message=""
          confirmLabel="닫기"
          surfaceVariant="menuGlass"
          onCancel={close}
          onConfirm={close}
        >
          {uri ? (
            <Image
              accessible
              accessibilityLabel="첨부된 문의 사진"
              testID="ticket-photo-view"
              source={{ uri }}
              resizeMode="contain"
              style={styles.photo}
              onError={() => {
                setUri(null);
                setFailed(true);
              }}
            />
          ) : failed ? (
            <CtaButton role="neutral" onPress={load}>
              <CtaText>사진 다시 불러오기</CtaText>
            </CtaButton>
          ) : (
            <Copy muted>사진을 불러오고 있어요.</Copy>
          )}
        </ConfirmDialog>
      ) : null}
    </>
  );
}

const styles = StyleSheet.create({
  open: { minHeight: 48, paddingHorizontal: 12 },
  label: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  photo: { width: '100%', height: 270 },
});
