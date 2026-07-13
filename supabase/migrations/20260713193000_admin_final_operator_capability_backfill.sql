begin;

-- Existing production operator accounts may have an explicit capabilities array from
-- an older bootstrap script. Preserve existing capabilities and append only the
-- finalized phase-5/final-operations capabilities required by each role.
update public.admin_operator_accounts
set capabilities = (
  select array(
    select distinct capability
    from unnest(capabilities || array[
      'operators.read',
      'operators.invite',
      'operators.role_request',
      'mfa.manage',
      'approvals.execute',
      'notifications.tokens',
      'notifications.segment_preview',
      'monitoring.read'
    ]::text[]) as capability
    order by capability
  )
),
updated_at = timezone('utc', now())
where role = 'admin';

update public.admin_operator_accounts
set capabilities = (
  select array(
    select distinct capability
    from unnest(capabilities || array[
      'operators.read',
      'operators.invite',
      'operators.lifecycle',
      'operators.role_request',
      'operators.recovery',
      'mfa.manage',
      'mfa.recover',
      'hospitals.merge',
      'users.pii_reveal',
      'pets.health_detail',
      'approvals.execute',
      'rollback.execute',
      'notifications.tokens',
      'notifications.segment_preview',
      'monitoring.read'
    ]::text[]) as capability
    order by capability
  )
),
updated_at = timezone('utc', now())
where role in ('super_admin', 'owner');

update public.admin_operator_accounts
set capabilities = (
  select array(
    select distinct capability
    from unnest(capabilities || array[
      'operators.read',
      'notifications.segment_preview',
      'monitoring.read'
    ]::text[]) as capability
    order by capability
  )
),
updated_at = timezone('utc', now())
where role in ('viewer', 'operator', 'moderator', 'hospital_reviewer');

commit;
