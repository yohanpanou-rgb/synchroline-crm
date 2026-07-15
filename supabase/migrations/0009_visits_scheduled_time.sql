-- Ώρα ραντεβού, για την προβολή ημερολογίου (Δευτέρα-Παρασκευή, 09:00-21:00, slots 30').
alter table public.visits
  add column scheduled_time time;
