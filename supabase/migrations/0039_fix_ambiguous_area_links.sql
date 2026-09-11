-- Η exact-match area_id backfill (0035/0037/0038) δεν λάμβανε υπόψη το
-- nomos, οπότε γιατροί εκτός Αττικής με region ίδιο με υπάρχουσα Αθηναϊκή
-- περιοχή συνδέθηκαν στη ΛΑΘΟΣ πόλη (π.χ. "ΑΜΠΕΛΟΚΗΠΟΙ" Θεσσαλονίκης ->
-- Αμπελόκηποι Αθήνας). Διόρθωση των συγκεκριμένων περιπτώσεων + αφαίρεση
-- ενός επικίνδυνου alias που προκάλεσε το ίδιο πρόβλημα αντίστροφα.

update doctors d
set area_id = (select id from areas where canonical_name = 'ΑΜΠΕΛΟΚΗΠΟΙ ΘΕΣΣΑΛΟΝΙΚΗΣ')
where d.region = 'ΑΜΠΕΛΟΚΗΠΟΙ' and d.nomos = 'ΘΕΣΣΑΛΟΝΙΚΗΣ';

insert into areas (canonical_name, lat, lon, aliases)
values ('ΗΡΑΚΛΕΙΟ ΚΡΗΤΗΣ', 35.3387, 25.1442, ARRAY[]::text[])
on conflict (canonical_name) do nothing;

update doctors d
set area_id = (select id from areas where canonical_name = 'ΗΡΑΚΛΕΙΟ ΚΡΗΤΗΣ')
where d.region = 'ΗΡΑΚΛΕΙΟ' and d.nomos = 'ΗΡΑΚΛΕΙΟΥ';

update doctors d
set area_id = null
where d.region = 'ΝΙΚΑΙΑ' and d.nomos = 'ΛΑΡΙΣΑΣ';

-- Το alias 'ΦΑΛΗΡΟ' στο ΦΑΛΗΡΟ ΘΕΣΣΑΛΟΝΙΚΗΣ έπιασε λάθος έναν γιατρό της
-- Αττικής (region='ΦΑΛΗΡΟ', εννοεί Παλαιό Φάληρο). Αφαίρεση alias -- bare
-- "ΦΑΛΗΡΟ" μένει ασαφές (καμία αυτόματη σύνδεση) αντί να μαντεύει λάθος πόλη.
update areas
set aliases = array_remove(aliases, 'ΦΑΛΗΡΟ')
where canonical_name = 'ΦΑΛΗΡΟ ΘΕΣΣΑΛΟΝΙΚΗΣ';

update doctors d
set area_id = (select id from areas where canonical_name = 'Π. ΦΑΛΗΡΟ')
where d.region = 'ΦΑΛΗΡΟ' and d.nomos = 'ΑΤΤΙΚΗΣ';
