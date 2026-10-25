/* global Deno */
import { createClient } from 'npm:@supabase/supabase-js@2.97.0';
import { GoogleAuth } from 'npm:google-auth-library@10.3.0';
import { verifyWorkerCredential } from '../_shared/worker-auth.js';
import {
  classifyPushResponse,
  collapseGroup,
  decryptPushToken,
  jsonReply,
} from '../_shared/notification-transport.js';

export async function handleNotificationWorker(request) {
  if (
    !verifyWorkerCredential(
      request,
      Deno.env.get('NURI_NOTIFICATION_WORKER_SECRET'),
    )
  )
    return jsonReply({ code: 'WORKER_AUTH_REQUIRED' }, 403);
  if (request.method !== 'POST')
    return jsonReply({ code: 'METHOD_NOT_ALLOWED' }, 405);
  const secret = Deno.env.get('NURI_PUSH_TOKEN_KEY'),
    accountJson = Deno.env.get('NURI_FCM_SERVICE_ACCOUNT');
  if (!secret || !accountJson)
    return jsonReply({ code: 'PUSH_PROVIDER_UNAVAILABLE' }, 503);
  try {
    const credentials = JSON.parse(accountJson);
    if (
      typeof credentials.project_id !== 'string' ||
      !/^[a-z0-9-]+$/.test(credentials.project_id)
    )
      return jsonReply({ code: 'PUSH_PROVIDER_UNAVAILABLE' }, 503);
    const auth = new GoogleAuth({
      credentials,
      scopes: ['https://www.googleapis.com/auth/firebase.messaging'],
    });
    const access = await auth.getAccessToken();
    if (!access) return jsonReply({ code: 'PUSH_PROVIDER_UNAVAILABLE' }, 503);
    const client = createClient(
      Deno.env.get('SUPABASE_URL'),
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY'),
      { auth: { persistSession: false, autoRefreshToken: false } },
    );
    const claimed = await client.rpc('claim_notification_deliveries_v3', {
      p_limit: 4,
    });
    if (claimed.error || !Array.isArray(claimed.data))
      return jsonReply({ code: 'QUEUE_UNAVAILABLE' }, 503);
    let accepted = 0;
    // Four short leases; no provider secret, token, nickname or message is logged.
    await Promise.all(
      claimed.data.map(async delivery => {
        let outcome = 'accepted';
        const promote = value => {
          const rank = {
            accepted: 0,
            permanent_failure: 1,
            provider_unavailable: 2,
            transient: 3,
          };
          if (rank[value] > rank[outcome]) outcome = value;
        };
        const devices = await client.rpc(
          'get_notification_delivery_devices_v3',
          { p_id: delivery.id, p_lease: delivery.leaseToken },
        );
        if (devices.error || !Array.isArray(devices.data))
          outcome = 'transient';
        else if (devices.data.length === 0) outcome = 'provider_unavailable';
        else {
          const pending = [...devices.data];
          await Promise.all(
            Array.from({ length: Math.min(4, pending.length) }, async () => {
              while (pending.length) {
                const device = pending.shift();
                if (!device) break;
                let token;
                try {
                  token = await decryptPushToken(
                    device.ciphertext,
                    device.userId,
                    device.deviceId,
                    secret,
                  );
                } catch {
                  promote('permanent_failure');
                  continue;
                }
                try {
                  // Recheck source/settings and this exact token immediately before each HTTP request.
                  const fresh = await client.rpc(
                    'get_notification_delivery_devices_v3',
                    { p_id: delivery.id, p_lease: delivery.leaseToken },
                  );
                  if (
                    fresh.error ||
                    !Array.isArray(fresh.data) ||
                    !fresh.data.some(
                      t =>
                        t.id === device.id &&
                        t.fingerprint === device.fingerprint,
                    )
                  ) {
                    promote('transient');
                    continue;
                  }
                  const response = await fetch(
                    `https://fcm.googleapis.com/v1/projects/${credentials.project_id}/messages:send`,
                    {
                      method: 'POST',
                      headers: {
                        authorization: `Bearer ${access}`,
                        'content-type': 'application/json',
                      },
                      signal: AbortSignal.timeout(8000),
                      body: JSON.stringify({
                        message: {
                          token,
                          data: {
                            notificationId: delivery.notificationId,
                            notificationSource: delivery.source,
                            recipientUserId: delivery.recipientUserId,
                            category: delivery.category,
                            title: delivery.title,
                            body: delivery.body,
                            expiresAt: new Date(
                              delivery.expiresAt,
                            ).toISOString(),
                            collapseGroup: collapseGroup(
                              delivery.category,
                              delivery.availableAt,
                              delivery.notificationId,
                            ),
                          },
                          android: {
                            priority: 'normal',
                            ttl:
                              Math.max(
                                0,
                                Math.min(
                                  86400,
                                  Math.floor(
                                    (Date.parse(delivery.expiresAt) -
                                      Date.now()) /
                                      1000,
                                  ),
                                ),
                              ) + 's',
                          },
                        },
                      }),
                    },
                  );
                  const result = classifyPushResponse(
                    response.status,
                    await response.json(),
                  );
                  if (result.result === 'accepted' || result.invalidToken) {
                    const receipt = await client.rpc(
                      'record_notification_device_result_v3',
                      {
                        p_id: delivery.id,
                        p_lease: delivery.leaseToken,
                        p_token: device.id,
                        p_hash: device.fingerprint,
                        p_result: result.result,
                        p_message: result.messageId ?? null,
                      },
                    );
                    if (receipt.error || receipt.data !== true) {
                      promote('transient');
                      continue;
                    }
                    if (result.result === 'accepted') accepted++;
                  }
                  if (result.result !== 'accepted') promote(result.result);
                } catch {
                  promote('transient');
                }
              }
            }),
          );
        }
        await client.rpc('finish_notification_delivery_v3', {
          p_id: delivery.id,
          p_lease: delivery.leaseToken,
          p_result: outcome,
        });
      }),
    );
    // Provider acceptance is not device display or user read confirmation.
    return jsonReply({
      claimed: claimed.data.length,
      providerAccepted: accepted,
    });
  } catch {
    return jsonReply({ code: 'PUSH_PROVIDER_UNAVAILABLE' }, 503);
  }
}
Deno.serve(handleNotificationWorker);
