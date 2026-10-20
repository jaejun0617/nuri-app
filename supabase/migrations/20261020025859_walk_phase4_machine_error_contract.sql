-- Forward machine error transport contract; human message is not a branch key.
do $wrap$
declare target regprocedure; definition text; handler text;
begin
 handler := $handler$
exception when sqlstate '22023' or sqlstate '42501' then
  if sqlerrm = any(array['WALK_INVALID_DURATION','WALK_INVALID_DISTANCE','WALK_INTEGER_OUT_OF_RANGE','WALK_INVALID_TIMESTAMP_ORDER','WALK_UNSUPPORTED_PAYLOAD_VERSION','WALK_UNSUPPORTED_ALGORITHM_VERSION','WALK_INVALID_PAYLOAD','WALK_INVALID_QUALITY_SUMMARY','WALK_INVALID_IDENTIFIER','WALK_PAYLOAD_CONFLICT','WALK_OVERLAP_CONFLICT','WALK_OWNER_MISMATCH','WALK_SESSION_REJECTED','WALK_SESSION_DELETED','WALK_RESERVATION_REQUIRED','WALK_ALREADY_ACTIVE']) then
    raise exception using errcode=sqlstate, message='Walk request could not be completed',
      detail=jsonb_build_object('walkErrorVersion',1,'walkCode',sqlerrm)::text;
  end if;
  raise;
$handler$;
 foreach target in array array['public.start_walk_v1(uuid,uuid)'::regprocedure,
   'public.finish_walk_v1(jsonb,text)'::regprocedure,'public.cancel_walk_v1(uuid,uuid)'::regprocedure,
   'public.delete_walk_session_v1(uuid,uuid)'::regprocedure,'public.delete_walk_route_v1(uuid,uuid)'::regprocedure,
   'public.get_walk_sessions_v1(uuid[])'::regprocedure] loop
   definition := pg_get_functiondef(target);
   if position('walkErrorVersion' in definition)>0 then raise exception 'WALK_ERROR_WRAPPER_ALREADY_INSTALLED'; end if;
   definition := regexp_replace(definition,'end[[:space:]]*\$function\$;?',handler || E'end\n$function$;','i');
   if position('walkErrorVersion' in definition)=0 then raise exception 'WALK_ERROR_WRAPPER_BODY_MISMATCH'; end if;
   execute definition;
 end loop;
end $wrap$;
