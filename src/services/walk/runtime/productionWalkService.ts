import { fetchActiveWalkReceipt, walkServerRepository } from '../server/supabaseWalkRepository';
import { createWalkProductNativePort } from './productNative';
import { createWalkProductService, type WalkProductContext } from './productWalkService';

// E/F supplies the existing cached auth and AppState boundary. This factory
// performs no boot-time auth reads, network, subscriptions or GPS collection.
export function createProductionWalkService(context: () => WalkProductContext) {
  return createWalkProductService({
    native: createWalkProductNativePort(), server: walkServerRepository,
    discoverActive: fetchActiveWalkReceipt, context,
  });
}
