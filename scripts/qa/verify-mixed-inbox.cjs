'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { createHash, randomUUID } = require('node:crypto');
const { execFileSync } = require('node:child_process');

const [mode, root, docker, receiptFile] = process.argv.slice(2);
const settings = JSON.parse(fs.readFileSync(path.join(root, 'status.private.json')));
const users = JSON.parse(fs.readFileSync(path.join(root, 'accounts.private.json')));
assert.equal(settings.API_URL, 'http://127.0.0.1:56321');
assert.equal(path.basename(root), 'n15-local');
const sql = query => execFileSync(docker, ['exec', 'supabase_db_n15-local', 'psql', '-U', 'postgres', '-XAtq', '-v', 'ON_ERROR_STOP=1', '-c', query], {
  env: { ...process.env, DOCKER_HOST: 'unix://' + path.join(root, 'colima/qa/docker.sock') }, encoding: 'utf8',
}).trim();
const rows = query => JSON.parse(sql(`select coalesce(jsonb_agg(r order by r::text),'[]') from (select to_jsonb(x) r from (${query}) x) y`));
const tokens = new Map();
async function post(route, data, role, expected = 200, service = false) {
  if (role && !tokens.has(role)) {
    const auth = await post('/auth/v1/token?grant_type=password', { email:users[role].email,password:users[role].password });
    assert.equal(auth.user.id,users[role].id);
    tokens.set(role,auth.access_token);
  }
  const res = await fetch(settings.API_URL + route, {
    method:'POST', signal:AbortSignal.timeout(12000),
    headers:{ 'Content-Type':'application/json',apikey:service?settings.SERVICE_ROLE_KEY:settings.ANON_KEY,
      ...(role?{Authorization:'Bearer '+tokens.get(role)}:service?{Authorization:'Bearer '+settings.SERVICE_ROLE_KEY}:{}) },
    body:JSON.stringify(data),
  });
  const json = await res.text();
  assert.equal(res.status,expected,route+' '+json.slice(0,160));
  return json ? JSON.parse(json) : null;
}
const rpc = (name,args={},role='reader',status=200,service=false) => post('/rest/v1/rpc/'+name,args,role,status,service);
const page = (args,role) => rpc('get_notification_inbox_v4',args,role);
const command = (op,id=null,source=null,role='reader') => rpc('command_notification_inbox_v4',{p_operation:op,p_id:id,p_source:source},role,204);
const target = (id,source,role='reader',status=200) => rpc('get_notification_target_v4',{p_id:id,p_source:source},role,status);
const count = async role => (await page({p_limit:0},role)).badge.count;
const pause = ms => new Promise(r=>setTimeout(r,ms));
const r = fs.existsSync(receiptFile) ? JSON.parse(fs.readFileSync(receiptFile)) : { checks:[], personal:[], events:[] };
const save = () => fs.writeFileSync(receiptFile,JSON.stringify(r,null,2),{mode:0o600});
function stableHash() {
  const content = {};
  for (const table of ['tickets','messages','ticket_reads','outbox','ticket_photos']) {
    const key=table==='tickets'?'id':'ticket_id';
    content[table]=rows(`select * from support_private.${table}${r.ticket && table!=='ticket_photos'?` where ${key}<>'${r.ticket}' or ${key} is null`:''}`);
  }
  for (const table of ['notice_drafts','notice_publications','capabilities'])
    content[table]=rows('select * from support_private.'+table);
  return createHash('sha256').update(JSON.stringify(content)).digest('hex');
}
function cursor() {
  return rows(`select actor_id,ticket_id,seq,served_seq from support_private.ticket_reads where ticket_id='${r.ticket}' and actor_id='${users.reader.id}'`);
}
async function staffReply(body) {
  let thread = await rpc('support_ticket_read_v2',{p_ticket:r.ticket},'editor');
  if(!r.events.length) {
    await rpc('support_ticket_command_v1',{p_key:randomUUID(),p_operation:'claim',p_ticket:r.ticket,p_revision:thread.revision},'editor');
    thread = await rpc('support_ticket_read_v2',{p_ticket:r.ticket},'editor');
  }
  await rpc('support_ticket_command_v1',{p_key:randomUUID(),p_operation:'reply',p_ticket:r.ticket,
    p_revision:thread.revision,p_seen_user_seq:thread.lastUserSeq,p_body:body,p_kind:'answer'},'editor');
  const event = rows(`select id,created_at,message_seq from support_private.outbox where ticket_id='${r.ticket}' order by message_seq desc limit 1`)[0];
  r.events.push(event);save();
  for(let i=0;i<100;i++) {
    const delivered=rows(`select d.delivered_at,o.lease_id from support_private.reply_deliveries d join support_private.outbox o on o.id=d.event_id where d.event_id='${event.id}'`);
    if(delivered.length) { Object.assign(event,delivered[0]);save();return event; }
    await pause(150);
  }
  throw Error('Independent worker did not deliver');
}
async function announce(reissue=false) {
  return rpc('publish_nuri_announcement_v3',{p_id:r.announcement,p_title:'N15 QA published announcement',p_body:'Isolated announcement detail',
    p_active:true,p_starts:null,p_expires:null,p_payload:{eventType:'news.published'},p_reissue:reissue},'editor');
}
function emit(when, index) {
  const id=sql(`select notification_private.emit_v3('${users.reader.id}','news.direct','qa','${r.run}:${index}','1',
    'N15 QA personal ${index}','Isolated personal detail','news','{"kind":"notification_detail"}','{}',null,null,'${when}',null,false);`);
  assert.match(id,/^[a-f0-9-]{36}$/);r.personal.push(id);save();return id;
}
async function main() {
  if (mode==='prepare') {
    assert(!r.run);
    r.run=randomUUID();r.announcement=randomUUID();r.protected=stableHash();r.started=new Date().toISOString();save();
    assert.equal(sql("select count(*) from support_private.outbox o cross join support_private.runtime f where o.state in ('pending','leased') and o.created_at>=f.reply_delivery_started_at"),'0');
    const old = await page();
    assert(!old.items.some(item=>item.notification_source==='support_reply'));
    sql('update support_private.runtime set mixed_inbox_enabled=true where singleton');
    r.base=await count('reader');r.otherBase=await count('other');
    const t=await rpc('support_ticket_create_v2',{p_key:randomUUID(),p_title:'N15 QA mixed inbox',p_category:'usage',
      p_body:'Isolated inquiry original',p_draft:null,p_photos:[]});
    r.ticket=t.id;save();
    const first=await staffReply('The independently delivered reply opens this exact inquiry.');
    assert(Date.parse(first.delivered_at)>=Date.parse(first.created_at));
    const legacy = await rpc('get_user_notifications_v3');
    assert(!legacy.items.some(item=>item.notification_source==='support_reply'));
    await announce();
    const at=sql('select statement_timestamp()-interval \'1 second\'');
    emit(at,1);emit(at,2);
    const firstPage=await page({p_limit:2});
    const last=firstPage.items.at(-1);
    assert(firstPage.hasMore);assert.equal(firstPage.unreadCount,r.base+4);
    const newer=emit(sql('select statement_timestamp()'),3);
    const next=await page({p_limit:2,p_snapshot:firstPage.snapshotAt,p_at:last.available_at,p_id:last.notification_id,p_source:last.notification_source});
    const firstTwo=[...firstPage.items,...next.items].map(x=>x.notification_source+':'+x.notification_id);
    assert.equal(new Set(firstTwo).size,4);
    assert(firstTwo.includes('support_reply:'+first.id));
    assert(!firstTwo.includes('user:'+newer));
    assert.equal(next.unreadCount,r.base+5);
    await command('hide',newer,'user');
    assert.equal(await count('reader'),r.base+4);
    r.before=cursor();assert.deepEqual(r.before,[]);
    await target(first.id,'support_reply');assert.deepEqual(cursor(),r.before);
    await target(first.id,'support_reply','other',404);
    await target(r.personal[0],'user','other',404);
    await command('hide',first.id,'support_reply','other');
    await command('read',first.id,'support_reply','other');
    assert.equal(await count('other'),r.otherBase+1);
    await rpc('get_notification_inbox_v4',{},null,401);
    await rpc('acknowledge_notification_reply_v4',{p_id:first.id},'reader',400);
    save();
  }
  if (mode==='prepare' || mode==='resume-prepare') {
    const current=cursor();
    assert.deepEqual(current,r.before ?? []);
    r.before=current;
    const first=r.events[0];
    assert.equal(await rpc('support_reply_deliver_v1',{p_event:first.id,p_lease:first.lease_id},null,200,true),true);
    assert.equal(sql(`select delivered_at from support_private.reply_deliveries where event_id='${first.id}'`).slice(0,19).replace(' ','T'),first.delivered_at.slice(0,19));
    await command('read',r.personal[1],'user');
    r.firstLegacyRead=sql(`select read_at from public.user_notifications where id='${r.personal[1]}'`);
    r.checks.push('disabled legacy coexistence','independent durable reply','same-time keyset and post-snapshot arrival','badge aggregate across pages','target owner/anon and read isolation','same lease idempotency','ack outside served rejected');
    r.readyUnread=await count('reader');save();
  } else if(mode==='device') {
    assert(r.readyUnread);
    r.after=cursor();
    assert.equal(r.after[0]?.actor_id,users.reader.id);
    assert.equal(r.after[0]?.seq,r.events[0].message_seq);
    assert.equal(await count('reader'),r.readyUnread-1);
    r.checks.push('device same reader before absent / after exact reply sequence');
    save();
  } else if(mode==='before-device-hide') {
    assert(r.after?.length);
    r.beforeBulk=cursor();
    r.beforeBulkMessages=rows(`select id,seq,body from support_private.messages where ticket_id='${r.ticket}'`);
    await staffReply('A later reply for the mark-all and hidden-target checks.');
    const added=await page();
    assert(added.items.some(item=>item.notification_id===r.events.at(-1).id && !item.is_read));
    save();
  } else if(mode==='after-device-mark') {
    assert.equal(await count('reader'),0);
    assert.deepEqual(cursor(),r.beforeBulk);
    assert.equal(sql(`select read_at from public.user_notifications where id='${r.personal[1]}'`),r.firstLegacyRead);
    const third=await staffReply('New delivery after mark-all must stay unread.');
    assert.equal(await count('reader'),1);
    r.beforeHide=rows(`select id,seq,body from support_private.messages where ticket_id='${r.ticket}'`);
    r.hideTarget=third.id;
    r.checks.push('device mark-all leaves actual ticket cursor, first legacy read and later delivery intact');
    save();
  } else if(mode==='after-device-hide') {
    assert.equal((await page()).items.length,0);
    await target(r.hideTarget,'support_reply','reader',404);
    assert.deepEqual(rows(`select id,seq,body from support_private.messages where ticket_id='${r.ticket}'`),r.beforeHide);
    assert.deepEqual(cursor(),r.beforeBulk);
    const second=r.events[1];
    assert.equal(await rpc('support_reply_deliver_v1',{p_event:second.id,p_lease:second.lease_id},null,200,true),true);
    assert.equal((await page()).items.length,0);
    await announce(true);
    const fourth=await staffReply('New delivery after hide-all must stay visible.');
    const after=await page();assert.equal(after.unreadCount,2);
    assert(after.items.some(x=>x.notification_id===fourth.id));
    assert(after.items.some(x=>x.notification_id===r.announcement && x.payload.publishVersion===2));
    sql('update support_private.runtime set mixed_inbox_enabled=false where singleton');
    await target(fourth.id,'support_reply','reader',404);
    assert.equal(await count('reader'),1);
    assert.equal(await count('other'),r.otherBase+1);
    r.checks.push('device hide-all preserves originals and reader cursor','announcement reissue and delivery replay','disabled flag closes target without changing legacy');
    save();
  } else if(mode==='long') {
    assert(r.after?.length && r.events.length===4);
    const previous=cursor()[0];
    for(let i=0;i<50;i++)
      await rpc('support_ticket_command_v1',{p_key:randomUUID(),p_operation:'message',p_ticket:r.ticket,p_body:'QA cursor position '+(i+1)});
    sql('update support_private.runtime set mixed_inbox_enabled=true where singleton');
    try {
      const long=await staffReply('Reply beyond the first page.');
      const lookup=await target(long.id,'support_reply');
      assert.equal(lookup.target.messageSeq,long.message_seq);
      assert(long.message_seq>50);
      const first=await rpc('support_ticket_read_v2',{p_ticket:r.ticket,p_after:0,p_limit:50});
      assert(!first.messages.some(x=>x.seq===long.message_seq));
      assert.equal(cursor()[0].seq,previous.seq);
      await rpc('acknowledge_notification_reply_v4',{p_id:long.id},'reader',400);
      const focused=await rpc('support_ticket_read_v2',{p_ticket:r.ticket,p_after:long.message_seq-1});
      assert.equal(focused.messages[0].seq,long.message_seq);
      const newest=await staffReply('Concurrent reply beyond the displayed target.');
      await rpc('acknowledge_notification_reply_v4',{p_id:long.id},'reader',204);
      assert.equal(cursor()[0].seq,long.message_seq);
      assert((await page()).items.some(x=>x.notification_id===newest.id && !x.is_read));
      await rpc('acknowledge_notification_reply_v4',{p_id:long.id},'reader',204);
      assert.equal(cursor()[0].seq,long.message_seq);
      r.checks.push('long target outside first page; served-only idempotent acknowledgment and later reply remains unread');
    } finally {
      sql('update support_private.runtime set mixed_inbox_enabled=false where singleton');
    }
    save();
  } else if(mode==='cleanup') {
    assert.match(r.run,/^[a-f0-9-]{36}$/);
    sql(`begin;
      update support_private.runtime set mixed_inbox_enabled=false where singleton;
      delete from public.user_notifications where user_id='${users.reader.id}' and source_type='qa' and source_id like '${r.run}:%';
      delete from public.announcements where id='${r.announcement}';
      delete from support_private.tickets where id='${r.ticket}' and owner_id='${users.reader.id}';
      commit;`);
    assert.equal(stableHash(),r.protected);
    r.cleaned=new Date().toISOString();save();
  } else throw Error('Unknown check mode');
  console.log(JSON.stringify({ mode, checks:r.checks,readyUnread:r.readyUnread, cleaned:r.cleaned }));
}
main().catch(error=>{console.error(error.message);process.exitCode=1;}).finally(async()=>{
  for (const role of tokens.keys()) await post('/auth/v1/logout?scope=local',{},role,204);
});
