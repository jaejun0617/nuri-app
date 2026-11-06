begin;

-- Keep the scheduler, delivery lease and preference contracts intact. Only
-- birthdays become visible at local midnight; their push remains due at 09:00.
do $migration$
declare
  definition text;
  anchor constant text := 'due:=title_private.anniversary_v2(occurrence.base_date,year);due_at:=(due+time ''09:00'') at time zone tz;';
  birthday_branch constant text := $branch$
    if occurrence.kind='birthday' then
     declare birthday_id uuid; inbox_at timestamptz:=(due+time '00:00') at time zone tz;
     begin
      if due<=occurrence.base_date or inbox_at<activated or p_now<inbox_at or p_now>=due_at+interval '1 day' then continue; end if;
      birthday_id:=notification_private.emit_v3(p_user,'pet.birthday','pets',pet.id::text,occurrence.base_date||':'||year,
       pet.name||'의 생일이에요','함께한 시간을 천천히 돌아보세요.','record',
       jsonb_build_object('kind','pet_anniversary','petId',pet.id),'{}',pet.id,null,inbox_at,null,false);
      if birthday_id is not null then
       insert into notification_private.delivery_v3(notification_id,recipient_user_id,dedupe_key,category,available_at,expires_at,next_attempt_at)
       select n.id,n.user_id,n.dedupe_key,n.category,due_at,due_at+interval '1 day',due_at
       from public.user_notifications n where n.id=birthday_id;
      end if;
     end;
     continue;
    end if;
$branch$;
begin
  select pg_get_functiondef('notification_private.scheduler_user_v3(uuid,timestamptz)'::regprocedure) into definition;
  if (length(definition)-length(replace(definition,anchor,'')))<>length(anchor)
    or position('birthday_id' in definition)>0 then
    raise exception using errcode='P0001',message='NURI_NOTIFICATION_SCHEDULER_CONTRACT_MISMATCH';
  end if;
  execute replace(definition,anchor,anchor||birthday_branch);
end;
$migration$;

commit;
