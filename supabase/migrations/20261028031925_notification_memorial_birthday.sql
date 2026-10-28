begin;

-- Birthdays belong to every owned pet, independently of the selected profile.
-- Preserve the existing opt-in, dedupe, time window and memorial-day contracts.
do $migration$
declare
  definition text;
  old_predicate constant text := 'if occurrence.kind<>''memorial'' and pet.death_date is not null then continue; end if;';
  new_predicate constant text := 'if occurrence.kind=''together_anniversary'' and pet.death_date is not null then continue; end if;';
begin
  select pg_get_functiondef('notification_private.scheduler_user_v3(uuid,timestamptz)'::regprocedure)
    into definition;
  if (length(definition) - length(replace(definition, old_predicate, ''))) <> length(old_predicate) then
    raise exception using errcode = 'P0001', message = 'NURI_NOTIFICATION_SCHEDULER_CONTRACT_MISMATCH';
  end if;
  -- Replace only the verified predicate; keep the function's privileges intact.
  execute replace(definition, old_predicate, new_predicate);
end;
$migration$;

commit;
