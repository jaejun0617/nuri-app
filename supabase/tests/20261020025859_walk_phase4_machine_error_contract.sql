-- Human text is deliberately not part of the machine contract.
set local role authenticated;
do $machine$
declare d text; m text; c text;
begin
 begin perform public.finish_walk_v1('{}'::jsonb,'');
   raise exception 'WALK_EXPECTED_INVALID_PAYLOAD';
 exception when sqlstate '22023' then
   get stacked diagnostics d=pg_exception_detail,m=message_text,c=returned_sqlstate;
   if (d::jsonb->>'walkErrorVersion')::int<>1 or d::jsonb->>'walkCode'<>'WALK_INVALID_PAYLOAD'
     or m='WALK_INVALID_PAYLOAD' or c<>'22023' then raise exception 'WALK_MACHINE_DETAIL_CONTRACT_FAILED';end if;
 end;
end $machine$;
reset role;
select 'PHASE4_MACHINE_ERROR_CONTRACT_PASS' as result;
