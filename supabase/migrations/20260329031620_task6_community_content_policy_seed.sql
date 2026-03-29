begin;

insert into public.community_blocked_terms (
  term,
  reason,
  target_type,
  target_field,
  match_mode,
  is_active
)
values
  (
    '씨발',
    'task6 initial high-confidence profanity seed',
    'all',
    'all',
    'contains',
    true
  ),
  (
    '개새끼',
    'task6 initial high-confidence profanity seed',
    'all',
    'all',
    'contains',
    true
  ),
  (
    '씹새끼',
    'task6 initial high-confidence profanity seed',
    'all',
    'all',
    'contains',
    true
  ),
  (
    '좆같',
    'task6 initial high-confidence profanity seed',
    'all',
    'all',
    'contains',
    true
  )
on conflict do nothing;

insert into public.community_blocked_term_patterns (
  pattern,
  reason,
  target_type,
  target_field,
  is_active
)
values
  (
    'ㅆ+\s*ㅂ+',
    'task6 initial high-confidence profanity obfuscation seed',
    'all',
    'all',
    true
  )
on conflict do nothing;

analyze public.community_blocked_terms;
analyze public.community_blocked_term_patterns;

commit;
