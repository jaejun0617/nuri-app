import React, { useEffect, useRef, useState } from 'react';
import { Button, Image, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../../navigation/RootNavigator';
import { isSecurityQaEnabled } from '../../services/securityQa/config';
import { qaFailureCode, resumeQaStorageCleanup, runQaSessionValidation, runQaStorageValidation } from '../../services/securityQa/validation';
import { runQaAutomaticMonitoringValidation } from '../../services/securityQa/monitoringValidation';

export default function SecurityValidationScreen({ navigation }: NativeStackScreenProps<RootStackParamList, 'SecurityValidation'>) {
  const insets = useSafeAreaInsets();
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState('READY');
  const [preview, setPreview] = useState<string | null>(null);
  const [storageReceipt, setStorageReceipt] = useState('');
  const displayCompletion = useRef<{ resolve: () => void; reject: (error: Error) => void } | null>(null);
  const displayFixture = (uri: string | null): Promise<void> => {
    if (uri === null) { setPreview(null); return Promise.resolve(); }
    return new Promise((resolve, reject) => {
      displayCompletion.current = { resolve, reject };
      setPreview(uri);
    });
  };
  const finishDisplay = (success: boolean) => {
    const pending = displayCompletion.current;
    displayCompletion.current = null;
    if (success) pending?.resolve();
    else pending?.reject(new Error('QA_IMAGE_DISPLAY_FAILED'));
  };
  useEffect(() => navigation.addListener('beforeRemove', event => {
    if (busy) event.preventDefault();
  }), [busy, navigation]);
  if (!isSecurityQaEnabled) return null;
  const run = async (operation: () => Promise<Record<string, string | boolean | number>>) => {
    if (busy) return;
    setBusy(true);
    setResult('RUNNING');
    try { setResult(JSON.stringify(await operation(), null, 2)); }
    catch (error: unknown) { setResult(qaFailureCode(error)); }
    finally { setBusy(false); }
  };
  return <ScrollView contentContainerStyle={[styles.content, { paddingTop: insets.top + 16, paddingBottom: insets.bottom + 16 }]}>
    <Button title="Back" disabled={busy} onPress={() => navigation.goBack()} />
    <Button title="Automatic monitoring validation" disabled={busy} onPress={() => run(runQaAutomaticMonitoringValidation)} />
    <Button title="Secure session validation" disabled={busy} onPress={() => run(runQaSessionValidation)} />
    <Button title="Storage lifecycle validation" disabled={busy} onPress={() => {
      setStorageReceipt('');
      return run(() => runQaStorageValidation(displayFixture, receipt => setStorageReceipt(JSON.stringify(receipt, null, 2))));
    }} />
    <Button title="Resume exact fixture cleanup" disabled={busy} onPress={() => run(resumeQaStorageCleanup)} />
    <View style={styles.preview}>{preview ? <Image key={preview} source={{ uri: preview }} style={styles.image} onLoad={() => finishDisplay(true)} onError={() => finishDisplay(false)} /> : null}</View>
    <Text selectable>{result}</Text>
    <Text selectable>{storageReceipt}</Text>
  </ScrollView>;
}

const styles = StyleSheet.create({ content: { padding: 20, gap: 16 }, preview: { height: 64, width: 64 }, image: { height: 64, width: 64 } });
