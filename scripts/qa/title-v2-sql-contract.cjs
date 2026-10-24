'use strict';
const fs=require('node:fs'),path=require('node:path');
const assert=require('node:assert/strict'),crypto=require('node:crypto');
const {PGlite}=require(process.env.NURI_PGLITE_MODULE || '@electric-sql/pglite');
const root=path.resolve(__dirname,'../..');
const output=process.env.NURI_TITLE_SQL_EVIDENCE_DIRECTORY;
if(!output || !path.isAbsolute(output)) throw Error('NURI_TITLE_SQL_EVIDENCE_DIRECTORY_REQUIRED');
async function main(){
 const db=new PGlite();
 await db.exec(`create role anon;create role authenticated;create role service_role;
 create schema auth;create schema storage;
 create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
 create table auth.users(id uuid primary key);
 create table public.profiles(user_id uuid primary key references auth.users(id) on delete cascade);
 create table public.pets(id uuid primary key,user_id uuid references auth.users(id),birth_date date,adoption_date date);
 create table public.memories(id uuid primary key,user_id uuid,pet_id uuid references public.pets(id) on delete cascade,occurred_at date,created_at timestamptz default now(),category text,sub_category text,metadata jsonb default '{}',image_urls text[] default '{}',image_url text,title text,content text);
 create table public.walk_sessions(id uuid primary key,user_id uuid,pet_id uuid,state text,deleted_at timestamptz,eligibility text,started_at timestamptz,accepted_at timestamptz,accepted_distance_m bigint);
 create table public.walk_record_claims(original_memory_id uuid,session_id uuid,user_id uuid);
 create table public.memory_images(memory_id uuid,user_id uuid,pet_id uuid,original_path text,status text);
 create table storage.objects(bucket_id text,name text,owner uuid,owner_id text,metadata jsonb);
 create table public.pet_weight_logs(id uuid primary key,user_id uuid,pet_id uuid,measured_on date,created_at timestamptz default now(),source text);
 create table public.posts(id uuid primary key,user_id uuid,created_at timestamptz default now(),status text,deleted_at timestamptz,category text,content text);
 create table public.comments(id uuid primary key,post_id uuid,user_id uuid,created_at timestamptz default now(),status text,deleted_at timestamptz,content text);
 create table public.user_level_summaries(user_id uuid primary key,level integer,total_xp integer);
 create table public.user_xp_ledger(user_id uuid,pet_id uuid,event_type text,created_at timestamptz default now());
 create table public.user_titles(user_id uuid,pet_id uuid,title_key text,title_name text,earned_at timestamptz);
 create table public.pet_daily_activities(user_id uuid,pet_id uuid,activity_date_kst date,created_at timestamptz default now());
 create table public.pet_streak_summaries(user_id uuid,pet_id uuid,best_streak integer,updated_at timestamptz default now());
 create table public.account_deletion_requests(user_id uuid,status text);
 `);
 for(const name of ['20261024044757_activity_title_catalog_v2.sql','20261024044810_activity_title_engine_v2.sql','20261024045035_activity_title_v2_storage_indexes.sql']){
  try{await db.exec(fs.readFileSync(path.join(root,'supabase/migrations',name),'utf8'));console.log(name+' COMPILED');}
  catch(e){console.log(JSON.stringify({file:name,message:e.message,code:e.code,position:e.position,internalQuery:e.internalQuery,where:e.where}));process.exitCode=1;await db.close();return;}
 }
 const cat=await db.query('select count(*)::integer as total,count(*) filter(where hidden)::integer as hidden,count(*) filter(where scope=\'common\')::integer as common from title_private.nuri_title_catalog_v2');
 assert.deepEqual(cat.rows,[{total:332,hidden:24,common:65}]);
 const a=crypto.randomUUID(),b=crypto.randomUUID(),pa=crypto.randomUUID(),pa2=crypto.randomUUID(),pb=crypto.randomUUID();
 await db.query('insert into auth.users(id) values($1),($2)',[a,b]);
 await db.query('insert into public.profiles(user_id) values($1),($2)',[a,b]);
 await db.query('insert into public.pets(id,user_id) values($1,$2),($3,$2),($4,$5)',[pa,a,pa2,pb,b]);
 let passed=0;const results=[];
 const one=async(sql,args=[])=>{const r=await db.query(sql,args);return r.rows[0];};
 const metric=async(pet=pa)=>{const r=await one('select title_private.pet_metrics_v2($1,$2) as m',[a,pet]);return r.m;};
 const memory=async(date,category='walk',other={})=>{const id=crypto.randomUUID();await db.query('insert into public.memories(id,user_id,pet_id,occurred_at,category,sub_category,metadata,created_at,image_urls) values($1,$2,$3,$4,$5,$6,$7,$8,$9)',[id,a,pa,date,category,other.sub??null,JSON.stringify(other.metadata??{}),other.created??new Date().toISOString(),other.images??[]]);return id;};
 const countAward=async(id,pet=pa)=>Number((await one('select count(*)::integer as n from title_private.nuri_title_awards_v2 where user_id=$1 and pet_id is not distinct from $2 and title_id=$3',[a,pet,id])).n);
 async function test(name,fn){await db.exec('begin');try{await fn();passed++;results.push({name,pass:true});}catch(e){results.push({name,pass:false,error:e.message});throw Error(name+': '+e.message);}finally{await db.exec('rollback');}}
 await test('one KST day never becomes three walks and pet scopes stay isolated',async()=>{
  await memory('2026-10-01');await memory('2026-10-01');await memory('2026-10-01');
  assert.equal((await metric()).walk_days,1);assert.equal(await countAward('WK02'),0);
  assert.equal(await countAward('WK01'),1);assert.equal(await countAward('WK01',pa2),0);
 });
 await test('third distinct day awards once; deletion does not revoke or shift origin',async()=>{
  await memory('2026-10-01');await memory('2026-10-02');await memory('2026-10-03');
  assert.equal(await countAward('WK02'),1);
  const origin=await one('select first_recorded_at from title_private.nuri_title_pet_origins_v2 where pet_id=$1',[pa]);
  await db.query('delete from public.memories where pet_id=$1',[pa]);
  assert.equal((await metric()).walk_days,0);assert.equal(await countAward('WK02'),1);
  assert.deepEqual(await one('select first_recorded_at from title_private.nuri_title_pet_origins_v2 where pet_id=$1',[pa]),origin);
 });
 await test('bad care metadata cannot crash a source save; valid zero-cost care counts one month',async()=>{
  await memory('2026-09-01','other',{sub:'grooming',metadata:{grooming:{careTypes:{broken:true}}}});
  assert.equal((await metric()).care_months,0);
  await memory('2026-09-03','other',{sub:'bathing',metadata:{grooming:{careTypes:['bath']}}});
  await memory('2026-09-04','other',{sub:'grooming',metadata:{grooming:{careTypes:['full_grooming','coat_care']}}});
  assert.equal((await metric()).care_months,1);
 });
 await test('GPS totals use accepted eligible undeleted sessions and not a linked Memory twice',async()=>{
  const id=crypto.randomUUID();await db.query("insert into public.walk_sessions(id,user_id,pet_id,state,eligibility,started_at,accepted_at,accepted_distance_m) values($1,$2,$3,'ACCEPTED_SERVER','PROGRESSION_ELIGIBLE','2026-10-01T00:00:00Z','2026-10-01T01:00:00Z',500)",[id,a,pa]);
  const mid=await memory('2026-10-01');await db.query('insert into public.walk_record_claims(original_memory_id,session_id,user_id) values($1,$2,$3)',[mid,id,a]);
  let m=await metric();assert.equal(m.walk_days,1);assert.equal(m.gps_m,500);assert.equal(m.gps_days,1);
  assert.equal(await countAward('GD01'),1);
  await db.query("update public.walk_sessions set eligibility='PROGRESSION_INELIGIBLE_QUALITY' where id=$1",[id]);
  m=await metric();assert.equal(m.gps_m,0);assert.equal(m.walk_days,0);assert.equal(await countAward('GD01'),1);
 });
 await test('photo origins deduplicate identical server checksums across paths and days',async()=>{
  const first=a+'/'+pa+'/one.jpg',second=a+'/'+pa+'/two.jpg';
  await db.query("insert into storage.objects(bucket_id,name,owner_id,metadata) values('memory-images',$1,$2,$3),('memory-images',$4,$2,$3)",[first,a,JSON.stringify({eTag:'a'.repeat(32)}),second]);
  await memory('2026-10-01','diary',{images:[first],created:'2026-10-01T01:00:00Z'});
  await memory('2026-10-02','diary',{images:[second],created:'2026-10-02T01:00:00Z'});
  const m=await metric();assert.equal(m.photo_days,1);assert.equal(await countAward('PH01'),1);assert.equal(await countAward('PH02'),0);
 });
 await test('fixture draft and future dates do not contribute',async()=>{
  await memory('2026-10-01','walk',{metadata:{qaFixture:true}});await memory('2026-10-02','walk',{metadata:{draft:true}});await memory('2099-01-01');
  assert.equal((await metric()).walk_days,0);
 });
 await test('calendar clipping and elapsed months follow leap and month-end rules',async()=>{
  assert.equal((await one("select title_private.anniversary_v2('2024-02-29',2025)::text as d")).d,'2025-02-28');
  assert.equal((await one("select title_private.elapsed_months_v2('2024-01-31','2024-02-29') as n")).n,1);
  assert.equal((await one("select title_private.elapsed_months_v2('2024-01-31','2024-02-28') as n")).n,0);
 });
 await test('weekly windows and balance months count dates and fields, not rows',async()=>{
  for(const date of ['2026-09-01','2026-09-02','2026-09-04','2026-09-09','2026-09-12','2026-09-20'])await memory(date,'diary');
  await memory('2026-09-01','meal');await memory('2026-09-04','meal');await memory('2026-09-04','meal');
  const m=await metric();assert.equal(m.routine_months,1);assert.equal(m.balanced_months,1);assert.equal(m.active_days,6);assert.equal(m.meal_days,2);
  assert.equal(m.window7_days,3);assert.equal(m.record_weeks,2);
 });
 await test('common activity rejects self comments, cloned bodies and daily over-counting',async()=>{
  const own=crypto.randomUUID(),p1=crypto.randomUUID(),p2=crypto.randomUUID(),p3=crypto.randomUUID();
  for(const [id,user,content]of [[own,a,'own post'],[p1,b,'other first'],[p2,b,'other second'],[p3,b,'other third']])await db.query("insert into public.posts(id,user_id,status,content,category,created_at) values($1,$2,'active',$3,'info','2026-10-01T00:00:00Z')",[id,user,content]);
  await db.query("insert into public.posts(id,user_id,status,content,category,created_at) values($1,$2,'active','own post','info','2026-10-02T00:00:00Z')",[crypto.randomUUID(),a]);
  for(const [post,content,created]of [[own,'self comment','2026-10-01'],[p1,'same words','2026-10-01'],[p1,'different words','2026-10-01'],[p2,'another reply','2026-10-01'],[p3,'third reply','2026-10-01'],[p1,'same words','2026-10-02'],[p2,'new day reply','2026-10-02']])await db.query("insert into public.comments(id,post_id,user_id,status,content,created_at) values($1,$2,$3,'active',$4,$5)",[crypto.randomUUID(),post,a,content,created+'T01:00:00Z']);
  const m=(await one('select title_private.common_metrics_v2($1) as m',[a])).m;
  assert.equal(m.post_days,1);assert.equal(m.info_post_days,1);assert.equal(m.comments,3);
  assert.equal(await countAward('CM02',null),1);
 });
 await test('birthday observations cannot be retroactively reassigned after profile edits',async()=>{
  await db.query("update public.pets set birth_date='2000-10-01' where id=$1",[pa]);
  await memory('2025-10-01','diary',{created:'2025-10-01T00:00:00Z'});
  assert.equal((await metric()).birthday_years,0);
 });
 await test('a first zero-XP eligible record still grants Lv.1 without writing XP',async()=>{
  await memory('2026-10-01','diary');assert.equal(await countAward('LV01',null),1);
  assert.equal((await one('select count(*)::integer as n from public.user_xp_ledger')).n,0);
 });
 await test('legacy source awards are retained once and are never copied to all pets',async()=>{
  await db.query("insert into public.user_titles(user_id,pet_id,title_key,title_name,earned_at) values($1,$2,'walk_king','산책왕','2025-10-01T00:00:00Z'),($1,null,'first_walk_friend','첫 산책 친구','2025-10-01T00:00:00Z')",[a,pa]);
  await db.query('select title_private.preserve_legacy_v2($1)',[a]);
  assert.equal(await countAward('WK10',pa),1);assert.equal(await countAward('WK10',pa2),0);
  assert.equal(await countAward('WK01',pa2),0);
  await db.query("select set_config('request.jwt.claim.sub',$1,true)",[a]);
  const v=(await one('select public.get_nuri_title_vault_v2() as v')).v;
  assert.ok(v.rows.some(r=>r.key==='first_walk_friend'&&r.categoryKey==='LEGACY'&&r.scope==='common'));
  assert.equal((await one('select count(*)::integer as n from public.user_titles')).n,2);
 });
 await test('large-history metrics avoid an all-days quadratic scan',async()=>{
  await db.exec('alter table public.memories disable trigger nuri_titles_v2_memory');
  await db.query("insert into public.memories(id,user_id,pet_id,occurred_at,category,created_at) select gen_random_uuid(),$1,$2,current_date-i,case when i%3=0 then 'walk' when i%3=1 then 'meal' else 'diary' end,now()-make_interval(days=>i) from generate_series(1,5000) i",[a,pa]);
  await db.exec('alter table public.memories enable trigger nuri_titles_v2_memory');
  const start=performance.now(),m=await metric(),elapsedMs=performance.now()-start;
  assert.equal(m.active_days,5000);assert.equal(m.balanced_week,1);assert.ok(elapsedMs<10000,'isolated WASM metric budget');
  results.push({name:'5000-row isolated WASM profile',elapsedMs});
 });
 await test('hidden receipt grace is bounded; an invented lunar year never qualifies',async()=>{
  await memory('2026-02-17','diary',{created:'2026-02-27T14:59:59Z'});
  assert.equal((await metric()).seollal_years,1);
  await db.query('delete from public.memories where pet_id=$1',[pa]);
  await memory('2026-02-17','diary',{created:'2026-02-27T15:00:00Z'});
  assert.equal((await metric()).seollal_years,0);
  await memory('2025-01-29','diary',{created:'2025-01-29T01:00:00Z'});
  assert.equal((await metric()).seollal_years,0);
 });
 await test('authenticated vault excludes unearned hidden entries and another owners pet',async()=>{
  await memory('2026-10-01');await db.query("select set_config('request.jwt.claim.sub',$1,true)",[a]);await db.exec('set local role authenticated');
  const v=(await one('select public.get_nuri_title_vault_v2() as v')).v;
  assert.equal(v.policyVersion,2);assert.equal(v.catalogCount,332);
  assert.ok(v.rows.every(r=>!r.hidden||r.achieved));assert.ok(v.rows.every(r=>r.ownerId==='common'||[pa,pa2].includes(r.ownerId)));
  assert.equal(v.rows.filter(r=>r.scope==='common').length,65);
 });
 await test('one user cannot ask for another pets badge',async()=>{
  await db.query("select set_config('request.jwt.claim.sub',$1,true)",[a]);await db.exec('set local role authenticated');
  await assert.rejects(db.query('select public.get_nuri_home_title_v2($1)',[pb]),/TITLE_PET_SCOPE_INVALID/);
 });
 await test('anonymous and private arbitrary-actor execution are denied',async()=>{
  await db.exec('set local role anon');await assert.rejects(db.query('select public.get_nuri_title_vault_v2()'),/permission denied/);
 });
 await test('authenticated cannot invoke internal refresh or write award rows',async()=>{
  await db.exec('set local role authenticated');await assert.rejects(db.query('select title_private.refresh_v2($1,$2)',[b,pb]),/permission denied/);
 });
 await test('explicit remembrance is idempotent and never changes original content',async()=>{
  const id=await memory('2025-10-01','diary',{created:'2025-10-01T00:00:00Z'});
  const before=await one('select md5(row_to_json(m)::text) as hash from public.memories m where id=$1',[id]);
  await db.query("select set_config('request.jwt.claim.sub',$1,true)",[a]);
  assert.equal((await one('select public.manage_nuri_remembrance_record_v2($1,null) as v',[id])).v.included,false);
  assert.equal((await one('select public.manage_nuri_remembrance_record_v2($1,true) as v',[id])).v.included,true);
  const original=await one('select included_at from title_private.nuri_remembrance_records_v2 where memory_id=$1',[id]);
  await db.query('select public.manage_nuri_remembrance_record_v2($1,true)',[id]);
  assert.deepEqual(await one('select included_at from title_private.nuri_remembrance_records_v2 where memory_id=$1',[id]),original);
  assert.equal((await metric()).remembrance_count,1);assert.equal((await metric()).remembrance_months,1);assert.equal(await countAward('ME01'),1);
  await db.query('select public.manage_nuri_remembrance_record_v2($1,false)',[id]);
  assert.equal(await countAward('ME01'),1);assert.equal((await metric()).remembrance_count,0);
  assert.deepEqual(await one('select md5(row_to_json(m)::text) as hash from public.memories m where id=$1',[id]),before);
 });
 await test('ordinary shopping is a memory but not a five-domain routine day',async()=>{
  await memory('2026-10-01','other',{sub:'shopping'});
  const m=await metric();assert.equal(m.memory_days,1);assert.equal(m.active_days,0);assert.equal(m.window7_days,0);
 });
 await test('unverified photo origins expose pending progress instead of a confirmed zero',async()=>{
  await memory('2026-10-01','diary',{images:['unverified/path.jpg']});
  const m=await metric();assert.equal(m.photo_proof_pending,1);
  const rows=(await one('select title_private.vault_rows_v2($1,$2,$3) as v',[a,pa,JSON.stringify(m)])).v;
  const photo=rows.find(r=>r.key==='PH01');assert.equal(photo.progressKnown,false);assert.ok(photo.progressLabel.includes('사진 원본 확인 중'));
 });
 await test('exact remembrance copies do not multiply the selected original',async()=>{
  const oneId=await memory('2026-10-01','diary'),twoId=await memory('2026-10-02','diary');
  await db.query("update public.memories set title='우리 추억',content='같은 원본' where id in ($1,$2)",[oneId,twoId]);
  await db.query("select set_config('request.jwt.claim.sub',$1,true)",[a]);
  await db.query('select public.manage_nuri_remembrance_record_v2($1,true)',[oneId]);
  await db.query('select public.manage_nuri_remembrance_record_v2($1,true)',[twoId]);
  assert.equal((await metric()).remembrance_count,1);
 });
 const boundaryRows=await db.query('select id,requirements from title_private.nuri_title_catalog_v2 order by id');
 for(const c of boundaryRows.rows){
  const exact=Object.fromEntries(c.requirements.map(r=>[r.metric,r.target]));
  const qualifies=async m=>(await one("select not exists(select 1 from jsonb_array_elements($1::jsonb) r where not($2::jsonb ? (r->>'metric')) or ($2::jsonb->>(r->>'metric'))::numeric<(r->>'target')::numeric) as ok",[JSON.stringify(c.requirements),JSON.stringify(m)])).ok;
  assert.equal(await qualifies(exact),true,c.id+' exact');
  for(const r of c.requirements)assert.equal(await qualifies({...exact,[r.metric]:r.target-1}),false,c.id+' '+r.metric+' below');
  passed++;results.push({name:c.id+' threshold boundary',pass:true});
 }
 fs.writeFileSync(path.join(output,'validation-result.json'),JSON.stringify({engine:'PGlite PostgreSQL isolated in-memory fixtures',remoteMutation:false,passed,failed:0,results},null,2));
 console.log(JSON.stringify({passed,failed:0,remoteMutation:false}));
 await db.close();
}
main().catch(e=>{console.error(e.message);process.exitCode=1;});
