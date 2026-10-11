import React, { useEffect, useState } from 'react';
import { Button, Image, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../../navigation/RootNavigator';
import { isSecurityQaEnabled } from '../../services/securityQa/config';
import { qaFailureCode, resumeQaStorageCleanup, runQaSessionValidation, runQaStorageValidation } from '../../services/securityQa/validation';

export default function SecurityValidationScreen({ navigation }: NativeStackScreenProps<RootStackParamList, 'SecurityValidation'>) {
  const insets = useSafeAreaInsets();
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState('READY');
  const [preview, setPreview] = useState<string | null>(null);
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
    <Button title="Secure session validation" disabled={busy} onPress={() => run(runQaSessionValidation)} />
    <Button title="Storage lifecycle validation" disabled={busy} onPress={() => run(() => runQaStorageValidation(setPreview))} />
    <Button title="Resume exact fixture cleanup" disabled={busy} onPress={() => run(resumeQaStorageCleanup)} />
    <View style={styles.preview}>{preview ? <Image source={{ uri: preview }} style={styles.image} /> : null}</View>
    <Text selectable>{result}</Text>
  </ScrollView>;
}

const styles = StyleSheet.create({ content: { padding: 20, gap: 16 }, preview: { height: 64, width: 64 }, image: { height: 64, width: 64 } });
