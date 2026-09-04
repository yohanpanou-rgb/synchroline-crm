-- Reps could only see their own profiles row (profiles_select_own_or_manager),
-- which silently broke every "pick a rep" dropdown for non-managers — e.g. the
-- doctor edit form's "Υπεύθυνος rep" select only ever listed the rep's own name,
-- since getAssignableReps() is scoped by this table's RLS. This is an internal
-- small-team CRM where rep names are already shown everywhere (doctor cards,
-- visit lists, hospital assignment) regardless of role, so open SELECT to any
-- authenticated user, matching the existing pattern for institutions.

drop policy if exists "profiles_select_own_or_manager" on public.profiles;

create policy "profiles_select_all" on public.profiles
  for select using (auth.role() = 'authenticated');
