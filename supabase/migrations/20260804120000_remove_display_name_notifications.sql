-- Display-name edits are personal profile preferences, not shared restaurant
-- activity. Remove their history and stop generating notifications for them.

drop trigger if exists notify_display_name_change on public.profiles;
drop function if exists public.notify_display_name_change();

delete from public.activity_notifications
where event_type = 'display_name_changed';
