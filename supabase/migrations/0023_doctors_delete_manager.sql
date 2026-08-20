-- Επιτρέπει σε manager/admin να διαγράφουν οριστικά γιατρούς (π.χ. θάνατος,
-- αποχώρηση, λανθασμένη καταχώρηση) — δεν υπήρχε καμία delete policy πριν.
create policy "doctors_delete_manager" on public.doctors
  for delete using (public.current_user_role() in ('manager', 'admin'));
