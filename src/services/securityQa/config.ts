import { NativeModules } from 'react-native';

type QaModule = { enabled: boolean; image: (mime: 'image/jpeg' | 'image/png') => Promise<string> };
const module: QaModule | undefined = NativeModules.NuriSecurityQa;
export const isSecurityQaEnabled = module?.enabled === true;
export function createQaImage(mime: 'image/jpeg' | 'image/png'): Promise<string> {
  if (!isSecurityQaEnabled || !module) return Promise.reject(new Error('SECURITY_QA_DISABLED'));
  return module.image(mime);
}
