# Synchroline CRM (CPO Greece) — Φάση 1 MVP

CRM ιατρικών επισκεπτών. Next.js (App Router) + Supabase (Postgres/Auth) + Tailwind.

## Πρώτη εκκίνηση

1. **Node.js** — εγκατέστησε Node.js LTS (18+) αν δεν υπάρχει ήδη.
2. **Dependencies**
   ```
   npm install
   ```
3. **Environment variables** — το `.env.local` υπάρχει ήδη με τα Supabase credentials
   του project `synchroline-crm`. Αν χρειαστεί νέο setup, αντέγραψε το
   `.env.local.example` και συμπλήρωσε:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `NEXT_PUBLIC_SITE_URL`
4. **Database schema** — στο Supabase Dashboard → SQL Editor, επικόλλησε και
   τρέξε το `supabase/schema_consolidated.sql` (ή τα αρχεία μέσα σε
   `supabase/migrations/` με τη σειρά, 0001 → 0007).
5. **Δημιουργία πρώτου χρήστη (admin)**
   - Supabase Dashboard → Authentication → Users → Add user (email + κωδικός).
   - Θα δημιουργηθεί αυτόματα εγγραφή στο `profiles` με `role = 'rep'`.
   - Ανέβασέ τον σε admin: SQL Editor →
     ```sql
     update public.profiles set role = 'admin' where email = 'το-email-σου';
     ```
6. **Dev server**
   ```
   npm run dev
   ```
   → http://localhost:3000

## Δομή

- `src/app/(auth)/login` — email/password login
- `src/app/(app)` — authenticated shell (sidebar desktop / bottom nav mobile),
  dashboard, doctors, visits, cycles
- `src/lib/supabase` — browser/server Supabase clients + middleware session refresh
- `src/lib/types/database.types.ts` — χειρόγραφοι τύποι που αντιστοιχούν στο
  schema· αντικαταστάθηκαν αργότερα από `supabase gen types typescript` όταν
  συνδεθεί το Supabase CLI
- `supabase/migrations/` — SQL schema Φάσης 1 με RLS policies

## Ρόλοι

- **rep** — βλέπει μόνο το δικό του πελατολόγιο/επισκέψεις, μπορεί να προτείνει
  νέο γιατρό (status `pending_approval`)
- **manager** — βλέπει τα πάντα (read), εγκρίνει/επεξεργάζεται γιατρούς
- **admin** — πλήρης πρόσβαση + διαχείριση κύκλων/στόχων

## Επόμενα βήματα (Φάση 2+)

`doctor_change_requests`, ημερολόγιο προγραμματισμού, `pharmacy_visits`,
`hospitals`, export πελατολογίου (SheetJS), document library, `absences` —
δες το PRD ενότητα 11.
