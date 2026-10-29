/* global Deno */
import { createClient } from 'npm:@supabase/supabase-js@2.97.0';
import {
  boundedJson,
  encryptPushToken,
  fingerprint,
  jsonReply,
} from '../_shared/notification-transport.js';

export async function handleNotificationDevice(request) {
  if (request.method !== 'POST')
    return jsonReply({ code: 'METHOD_NOT_ALLOWED' }, 405);
  try {
    const bearer = request.headers
      .get('authorization')
      ?.match(/^Bearer\s+(.+)$/i)?.[1];
    if (!bearer) return jsonReply({ code: 'AUTH_REQUIRED' }, 401);
    const client = createClient(
      Deno.env.get('SUPABASE_URL'),
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY'),
      { auth: { persistSession: false, autoRefreshToken: false } },
    );
    const identity = await client.auth.getUser(bearer);
    if (
      identity.error ||
      !identity.data.user ||
      identity.data.user.is_anonymous
    )
      return jsonReply({ code: 'AUTH_REQUIRED' }, 401);
    const input = await boundedJson(request),
      secret = Deno.env.get('NURI_PUSH_TOKEN_KEY');
    const cohort = await client.rpc('notification_push_qa_allowed_v3', {
      p_user: identity.data.user.id,
    });
    const configured = Boolean(
      !cohort.error && cohort.data === true &&
      secret && Deno.env.get('NURI_FCM_SERVICE_ACCOUNT'),
    );
    if (input.action === 'status') return jsonReply({ configured });
    if (
      !['register', 'revoke'].includes(input.action) ||
      typeof input.deviceId !== 'string' ||
      input.deviceId.length < 12 || input.deviceId.length > 128
    ) return jsonReply({ code: 'INVALID_TOKEN_REQUEST' }, 400);
    const verified = await client.auth.getClaims(bearer);
    const claims = verified.data?.claims;
    if (
      verified.error || claims?.sub !== identity.data.user.id ||
      typeof claims.session_id !== 'string' ||
      !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(claims.session_id)
    ) return jsonReply({ code: 'AUTH_REQUIRED' }, 401);
    const owner = identity.data.user.id;
    if (input.action === 'revoke') {
      if (!['user_logout', 'user_opt_out', 'account_deleted'].includes(input.reason))
        return jsonReply({ code: 'INVALID_REVOKE_REQUEST' }, 400);
      const result = await client.rpc('revoke_notification_device_v3', {
        p_user: owner, p_device: input.deviceId,
        p_session: claims.session_id, p_reason: input.reason,
      });
      if (result.error) return jsonReply({ code: 'DEVICE_REVOKE_FAILED' }, 503);
      return jsonReply({ revoked: result.data });
    }
    if (!configured)
      return jsonReply({ code: 'PUSH_PROVIDER_UNAVAILABLE' }, 503);
    if (
      typeof input.token !== 'string' ||
      input.token.length < 20 ||
      input.token.length > 4096
    )
      return jsonReply({ code: 'INVALID_TOKEN_REQUEST' }, 400);
    const { error } = await client.rpc('register_notification_device_v3', {
      p_user: owner,
      p_session: claims.session_id,
      p_device: input.deviceId,
      p_hash: await fingerprint(input.token),
      p_cipher: await encryptPushToken(
        input.token,
        owner,
        input.deviceId,
        secret,
      ),
    });
    if (error?.message === 'NURI_NOTIFICATION_STALE_DEVICE_SESSION')
      return jsonReply({ code: 'DEVICE_SESSION_STALE' }, 409);
    if (error?.message === 'NURI_NOTIFICATION_SESSION_EXPIRED')
      return jsonReply({ code: 'DEVICE_SESSION_EXPIRED' }, 401);
    if (error)
      return jsonReply(
        {
          code:
            error.code === '42501'
              ? 'OPT_IN_REQUIRED'
              : 'DEVICE_REGISTER_FAILED',
        },
        error.code === '42501' ? 403 : 503,
      );
    return jsonReply({ registered: true });
  } catch (error) {
    return jsonReply(
      {
        code:
          error?.message === 'BODY_TOO_LARGE'
            ? 'BODY_TOO_LARGE'
            : 'DEVICE_REGISTER_FAILED',
      },
      error?.message === 'BODY_TOO_LARGE' ? 413 : 503,
    );
  }
}
Deno.serve(handleNotificationDevice);
