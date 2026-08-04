-- Track the latest notification viewed by each user so unread badges remain
-- consistent across sessions and devices.

create table public.activity_notification_reads (
  user_id uuid primary key references auth.users(id) on delete cascade,
  last_seen_notification_id bigint not null default 0 check (last_seen_notification_id >= 0),
  viewed_at timestamptz not null default now()
);

alter table public.activity_notification_reads enable row level security;

create policy "users read own notification state"
on public.activity_notification_reads for select to authenticated
using (user_id = auth.uid());

grant select on public.activity_notification_reads to authenticated;

create or replace function public.mark_activity_notifications_viewed(latest_notification_id bigint)
returns bigint
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_id uuid := auth.uid();
  verified_notification_id bigint;
begin
  if actor_id is null then
    raise exception using errcode = '42501', message = 'Authentication is required';
  end if;

  if latest_notification_id is null or latest_notification_id < 1 then
    raise exception using errcode = '22023', message = 'A valid notification is required';
  end if;

  select activity_notifications.id
    into verified_notification_id
    from public.activity_notifications
   where activity_notifications.id = latest_notification_id;

  if not found then
    raise exception using errcode = 'P0002', message = 'Notification not found';
  end if;

  insert into public.activity_notification_reads (
    user_id,
    last_seen_notification_id,
    viewed_at
  ) values (
    actor_id,
    verified_notification_id,
    now()
  )
  on conflict (user_id) do update
    set last_seen_notification_id = greatest(
      public.activity_notification_reads.last_seen_notification_id,
      excluded.last_seen_notification_id
    ),
    viewed_at = case
      when excluded.last_seen_notification_id > public.activity_notification_reads.last_seen_notification_id
        then excluded.viewed_at
      else public.activity_notification_reads.viewed_at
    end;

  select last_seen_notification_id
    into verified_notification_id
    from public.activity_notification_reads
   where user_id = actor_id;

  return verified_notification_id;
end;
$$;

revoke all on function public.mark_activity_notifications_viewed(bigint) from public, anon;
grant execute on function public.mark_activity_notifications_viewed(bigint) to authenticated;
