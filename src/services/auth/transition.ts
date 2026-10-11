import type { Session } from '@supabase/supabase-js';
import type { resolveBootRoute } from '../app/boot';

export type AuthEntryRoute = ReturnType<typeof resolveBootRoute>;
type Resolver = (session?: Session) => Promise<AuthEntryRoute>;
let owner: Resolver | null = null;

// AppProviders owns validation/profile/pet readiness. Callback screens only
// render the resulting route; they must not race its asynchronous bootstrap.
export function registerAuthTransitionOwner(resolver: Resolver): () => void {
  owner = resolver;
  return () => { if (owner === resolver) owner = null; };
}

export function resolveAuthTransition(session?: Session): Promise<AuthEntryRoute> {
  if (!owner) return Promise.reject(new Error('AUTH_TRANSITION_NOT_READY'));
  return owner(session);
}
