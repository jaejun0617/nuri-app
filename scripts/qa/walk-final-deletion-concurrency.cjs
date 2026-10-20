#!/usr/bin/env node
'use strict';
// ONE CLI holder + independent Management SQL waiter. Parallel CLI login-role
// initialization failed28P01; retain that failure. Require observed PgSleep and
// waiter database_ms>=1000. Existing canonical QA only; no durable Auth fixture.
// Derived test-only capabilities below are NOT production recovery secrets.
const fs = require('node:fs');
const crypto = require('node:crypto');
const path = require('node:path');
const qa =
  "(select u.id from public.nuri_public_ranking_exclusions e join auth.users u on u.id=e.user_id where e.classification='canonical_qa' and e.exclude_from_public_ranking and u.deleted_at is null order by u.id limit 1)";
function expressions(marker) {
  if (!/^[0-9a-f]{32}$/.test(marker)) throw Error('INVALID_RUN_MARKER');
  return {
    id: k => `md5('${marker}:${k}')::uuid`,
    cap: n =>
      `encode(extensions.digest('test-only:${marker}:cap:${n}','sha256'),'hex')`,
    auth: `select set_config('request.jwt.claim.sub',${qa}::text,true);set local role authenticated;`,
  };
}
function plan() {
  const marker = crypto.randomBytes(16).toString('hex');
  const fixtureName = 'WD' + marker.slice(0, 12);
  const { id, cap, auth } = expressions(marker);
  const prepare = (n, p = 0) =>
    `public.prepare_walk_final_deletion_v1(${id('r' + n)},'PET_FINAL',${id(
      'p' + p,
    )},${cap(n)})`;
  const ack = n =>
    `public.ack_walk_final_deletion_v1(${id('r' + n)},'PET_FINAL',${cap(n)})`;
  const specs = [
    [
      'same_request_replay',
      `perform ${prepare(0)};`,
      `outcome:=${prepare(0)}->>'state';`,
      'PENDING',
    ],
    [
      'two_devices_independent_watches',
      `perform ${prepare(1)};`,
      `outcome:=${prepare(2)}->>'state';`,
      'PENDING',
    ],
    [
      'ack_duplicate_after_proof_loss',
      `perform ${ack(0)};`,
      `outcome:=${ack(0)}->>'state';`,
      'ACKNOWLEDGED',
    ],
    [
      'registration_wins_delete',
      `perform ${prepare(3, 1)};`,
      `delete from public.pets where id=${id(
        'p1',
      )} and user_id=auth.uid();get diagnostics affected=row_count;outcome:=case when affected=1 then 'DELETED' else 'ZERO' end;`,
      'DELETED',
    ],
    [
      'delete_wins_registration',
      `delete from public.pets where id=${id('p2')} and user_id=auth.uid();`,
      `begin perform ${prepare(
        4,
        2,
      )};outcome:='UNEXPECTED_SUCCESS';exception when sqlstate '42501' then get stacked diagnostics detail=pg_exception_detail;if (detail::jsonb->>'walkCode') is distinct from 'WALK_DELETE_TARGET_UNAVAILABLE' then raise;end if;outcome:='DENIED';end;`,
      'DENIED',
    ],
  ];
  return {
    marker,
    setup: `insert into public.pets(id,user_id,name) select p,${qa},'${fixtureName}' from unnest(array[${[
      0, 1, 2,
    ]
      .map(n => id('p' + n))
      .join(',')}])p;select true as setup;`,
    cases: specs.map(([label, holder, waiter, expected], n) => {
      const app = 'wd_' + marker + '_' + n;
      return {
        label,
        expected,
        holder: `begin;set local statement_timeout='30s';set local application_name='${app}';${auth}do $$begin ${holder}end$$;select pg_sleep(8);commit;select true as holder_ok;`,
        latch: `select exists(select 1 from pg_stat_activity where application_name='${app}' and wait_event='PgSleep') as latched;`,
        waiter: `begin;set local statement_timeout='25s';create temporary table wd_result(outcome text,database_ms numeric) on commit drop;grant select,insert on wd_result to authenticated;${auth}do $$declare started timestamptz:=clock_timestamp();outcome text;affected integer;detail text;begin ${waiter}insert into wd_result values(outcome,extract(epoch from clock_timestamp()-started)*1000);end$$;select * from wd_result;commit;`,
      };
    }),
    // Replay B's same registered identity, then perform the owned deletion.
    deleteAfterIndependentWatches: `begin;${auth}select ${prepare(
      2,
    )};delete from public.pets where id=${id(
      'p0',
    )} and user_id=auth.uid();commit;select true as deleted;`,
    cleanup: `delete from public.pets where id=any(array[${[0, 1, 2]
      .map(n => id('p' + n))
      .join(
        ',',
      )}]) and user_id=${qa} and name='${fixtureName}';delete from walk_private.final_deletion_receipts where request_id=any(array[${[
      0, 1, 2, 3, 4,
    ]
      .map(n => id('r' + n))
      .join(
        ',',
      )}]);select (select count(*) from public.pets where id=any(array[${[
      0, 1, 2,
    ]
      .map(n => id('p' + n))
      .join(
        ',',
      )}]))+(select count(*) from walk_private.final_deletion_receipts where request_id=any(array[${[
      0, 1, 2, 3, 4,
    ]
      .map(n => id('r' + n))
      .join(',')}])) as remaining;`,
  };
}
function key() {
  const source = fs.readFileSync(
    path.join(process.cwd(), 'src/services/supabase/config.ts'),
    'utf8',
  );
  const v = source.match(
    /export\s+const\s+SUPABASE_ANON_KEY\s*=\s*["']([^"']+)["']/,
  )?.[1];
  if (!v) throw Error('CLIENT_KEY_UNAVAILABLE');
  if (v.startsWith('sb_publishable_')) return v;
  const claims = JSON.parse(
    Buffer.from(v.split('.')[1], 'base64url').toString(),
  );
  if (claims.role !== 'anon' || claims.ref !== 'grmekesqoydylqmyvfke')
    throw Error('CLIENT_KEY_INVALID');
  return v;
}
async function http(marker, n, expected, operation, forged) {
  expressions(marker);
  const h = crypto
    .createHash('md5')
    .update(marker + ':r' + n)
    .digest('hex');
  const requestId = `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(
    12,
    16,
  )}-${h.slice(16, 20)}-${h.slice(20)}`;
  const capability = crypto
    .createHash('sha256')
    .update(`test-only:${marker}:cap:${forged ? n + 5 : n}`)
    .digest('hex');
  if (!['recover', 'ack'].includes(operation))
    throw Error('HTTP_OPERATION_INVALID');
  const response = await fetch(
    `https://grmekesqoydylqmyvfke.supabase.co/rest/v1/rpc/${operation}_walk_final_deletion_v1`,
    {
      method: 'POST',
      signal: AbortSignal.timeout(15000),
      headers: { apikey: key(), 'Content-Type': 'application/json' },
      body: JSON.stringify({
        p_request_id: requestId,
        p_purpose: 'PET_FINAL',
        p_capability: capability,
      }),
    },
  );
  const body = await response.json();
  const pass =
    expected === 'DENIED'
      ? !response.ok && body.code === '42501'
      : response.ok && body.requestId === requestId && body.state === expected;
  console.log(
    JSON.stringify({
      operation,
      authorizationHeader: false,
      status: response.status,
      expected,
      pass,
    }),
  );
  if (!pass) process.exitCode = 1;
}
if (process.argv[2] === '--plan') console.log(JSON.stringify(plan()));
else if (process.argv[2] === '--http')
  http(
    process.argv[3],
    Number(process.argv[4]),
    process.argv[5],
    process.argv[6],
    process.argv[7] === 'forged',
  ).catch(() => {
    console.log(
      JSON.stringify({ pass: false, kind: 'HTTP_TRANSPORT_FAILURE' }),
    );
    process.exitCode = 1;
  });
else throw Error('Use --plan with an independent SQL coordinator, or --http');
