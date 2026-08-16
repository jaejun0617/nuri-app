begin;

-- Report triggers call refresh through a SECURITY DEFINER trigger function. The
-- refresh helper itself must not remain a direct client moderation surface.
revoke all on function public.refresh_community_moderation_queue(text, uuid, uuid)
  from public, anon, authenticated;
grant execute on function public.refresh_community_moderation_queue(text, uuid, uuid)
  to service_role;

commit;
