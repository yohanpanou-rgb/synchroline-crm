-- Τίτλος (κυρίως για νοσοκομειακούς γιατρούς) — ελεύθερο κείμενο, χωρίς
-- CHECK constraint, ίδια λογική με τα υπόλοιπα evolvable πεδία κατηγορίας
-- σε αυτό το schema (η λίστα τιμών ζει στο UI <Select>, όχι στη βάση).
alter table public.doctors
  add column academic_title text;
