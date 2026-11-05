'use strict';
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const assert = require('node:assert/strict');

async function main() {
  const root = path.resolve(__dirname, '../..');
  const shared = fs.readFileSync(path.join(root, 'supabase/functions/_shared/notification-transport.js'), 'utf8');
  const transport = await import('data:text/javascript;base64,' + Buffer.from(shared).toString('base64'));
  const device = { id:'fixture-device', userId:'fixture-owner', deviceId:'fixture-install', fingerprint:'fixture-hash', ciphertext:'fixture-only' };
  let freshBadge = { count:2, observedAt:200, validUntil:400 };
  const requests = [];
  let deviceCalls = 0;
  let rejectFresh = false;
  let authorized = true;
  const rpc = async name => {
    if (name === 'claim_notification_deliveries_v3') return { data:[{id:'fixture-lease-row',leaseToken:'fixture-lease',notificationId:'fixture-notification',source:'user',recipientUserId:'fixture-owner',category:'news',title:'QA',body:'QA',expiresAt:'2030-01-01T00:00:00Z',availableAt:'2026-11-05T00:00:00Z'}], error:null };
    if (name === 'get_notification_delivery_devices_v3') {
      deviceCalls++;
      return { data:rejectFresh && deviceCalls % 2 === 0 ? [] : [{...device,badge:deviceCalls % 2 === 1 ? {count:3,observedAt:100,validUntil:400} : freshBadge}],error:null };
    }
    return { data:true,error:null };
  };
  const context = vm.createContext({
    Response, Request, AbortSignal, Date, JSON,
    Deno:{ env:{get:name => name === 'NURI_FCM_SERVICE_ACCOUNT' ? '{"project_id":"fixture-project"}' : 'fixture-only'},serve:() => {} },
    fetch:async (_url, init) => { requests.push(JSON.parse(init.body)); return new Response('{"name":"projects/fixture/messages/accepted"}',{status:200}); },
  });
  const entry = new vm.SourceTextModule(fs.readFileSync(path.join(root,'supabase/functions/notification-worker-v3/index.js'),'utf8'),{context});
  await entry.link(async specifier => {
    const exports = specifier.includes('supabase-js') ? {createClient:() => ({rpc})} :
      specifier.includes('google-auth-library') ? {GoogleAuth:class { async getAccessToken() { return 'fixture-only'; } }} :
      specifier.endsWith('worker-auth.js') ? {verifyWorkerCredential:() => authorized} :
      {...transport,decryptPushToken:async () => 'fixture-provider-token'};
    const module = new vm.SyntheticModule(Object.keys(exports),function () {
      Object.entries(exports).forEach(([name,value]) => this.setExport(name,value));
    },{context});
    return module;
  });
  await entry.evaluate();
  const run = () => entry.namespace.handleNotificationWorker(new Request('https://example.invalid/worker',{method:'POST'}));
  assert.equal((await run()).status,200);
  assert.equal(requests.length,1);
  assert.equal(requests[0].message.data.inboxUnreadCount,'2');
  assert.equal(requests[0].message.data.inboxObservedAt,'200');
  assert.equal(requests[0].message.data.inboxValidUntil,'400');
  // Recheck wins over the earlier claim-side count and disappears safely when
  // the exact token/source is no longer eligible. No external HTTP occurs.
  rejectFresh = true;
  await run();
  assert.equal(requests.length,1);
  rejectFresh = false;
  freshBadge = null;
  await run();
  assert.equal(requests.length,2);
  assert.equal(requests[1].message.data.inboxUnreadCount,undefined);
  authorized = false;
  assert.equal((await run()).status,403);
  assert.equal(requests.length,2);
  console.log(JSON.stringify({passed:11,scope:'actual worker handler with fixture-only DB/provider; no network'}));
}
main().catch(error => { console.error(error.message); process.exitCode=1; });
