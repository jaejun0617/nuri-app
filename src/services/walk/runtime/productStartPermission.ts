import type { LocationPermissionGrant } from '../../location/permission';
import type { WalkProductContext } from './productWalkService';

// The OS dialog may cross AppState boundaries. Do not silently continue an old
// intent or silently discard the tap: the screen offers an explicit retry.
export async function startWalkWithPermission(d: {
  context: () => WalkProductContext;
  check: () => Promise<LocationPermissionGrant>;
  request: () => Promise<LocationPermissionGrant>;
  start: () => Promise<void>;
}): Promise<'STARTED' | 'DENIED' | 'RETRY_EXPLICITLY'> {
  const captured = d.context();
  const current = () => {
    const c = d.context();
    return (
      c.ownerId === captured.ownerId &&
      !!c.ownerId &&
      c.foreground &&
      c.revision === captured.revision
    );
  };
  if (!current()) return 'RETRY_EXPLICITLY';
  let grant = await d.check();
  if (!current()) return 'RETRY_EXPLICITLY';
  if (grant.status !== 'granted' || grant.accuracy !== 'precise')
    grant = await d.request();
  if (!current()) return 'RETRY_EXPLICITLY';
  if (grant.status !== 'granted' || grant.accuracy !== 'precise')
    return 'DENIED';
  await d.start();
  return 'STARTED';
}
