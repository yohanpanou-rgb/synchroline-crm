-- Όλες οι περιοχές γράφονται πλήρως (ΑΓΙΑ/ΑΓΙΟΣ/ΑΓΙΟΙ, ΝΕΑ/ΝΕΟ, ΠΑΛΑΙΟ),
-- όχι συντετμημένα ("ΑΓ.", "Ν.", "Π."). Αντιστροφή canonical_name/alias στις
-- περιοχές areas που είχαν τη συντομογραφία ως canonical, + κανονικοποίηση
-- του ωμού doctors.region.

update areas set canonical_name = 'ΑΓΙΟΣ ΔΗΜΗΤΡΙΟΣ', aliases = ARRAY['ΑΓ. ΔΗΜΗΤΡΙΟΣ','ΑΓ.ΔΗΜΗΤΡΙΟΣ']
where id = '7526a27b-aaf4-4bd7-97b6-5d1b62dc7708';
update areas set canonical_name = 'ΑΓΙΑ ΠΑΡΑΣΚΕΥΗ', aliases = ARRAY['ΑΓ. ΠΑΡΑΣΚΕΥΗ','ΑΓ.ΠΑΡΑΣΚΕΥΗ']
where id = '9bce3bc9-fb96-4092-82ab-6da4737fca65';
update areas set canonical_name = 'ΑΓΙΟΙ ΑΝΑΡΓΥΡΟΙ', aliases = ARRAY['ΑΓ. ΑΝΑΡΓΥΡΟΙ','ΑΓ.ΑΝΑΡΓΥΡΟΙ']
where id = 'eecde928-16a1-4ac6-84b2-57c807338fa2';
update areas set canonical_name = 'ΑΓΙΑ ΒΑΡΒΑΡΑ', aliases = ARRAY['ΑΓ. ΒΑΡΒΑΡΑ','ΑΓ.ΒΑΡΒΑΡΑ']
where id = '3cbb06a7-6760-4cde-ab0c-498badbeab74';

update doctors set region = 'ΑΓΙΑ ΠΑΡΑΣΚΕΥΗ' where region in ('ΑΓ. ΠΑΡΑΣΚΕΥΗ','ΑΓ.ΠΑΡΑΣΚΕΥΗ');
update doctors set region = 'ΑΓΙΟΣ ΔΗΜΗΤΡΙΟΣ' where region in ('ΑΓ. ΔΗΜΗΤΡΙΟΣ','ΑΓ.ΔΗΜΗΤΡΙΟΣ');
update doctors set region = 'ΑΓΙΟΙ ΑΝΑΡΓΥΡΟΙ' where region in ('ΑΓ. ΑΝΑΡΓΥΡΟΙ','ΑΓ.ΑΝΑΡΓΥΡΟΙ');
update doctors set region = 'ΑΓΙΑ ΒΑΡΒΑΡΑ' where region in ('ΑΓ. ΒΑΡΒΑΡΑ','ΑΓ.ΒΑΡΒΑΡΑ');

update areas set canonical_name = 'ΝΕΑ ΕΡΥΘΡΑΙΑ', aliases = ARRAY['Ν. ΕΡΥΘΡΑΙΑ','Ν.ΕΡΥΘΡΑΙΑ']
where id = '76ed3d1e-e560-414f-afc7-10c6c236c25e';
update areas set canonical_name = 'ΝΕΟ ΗΡΑΚΛΕΙΟ', aliases = ARRAY['Ν. ΗΡΑΚΛΕΙΟ','Ν.ΗΡΑΚΛΕΙΟ']
where id = 'e6b2a0a6-9adf-4e0f-bdd0-d8dfd48f54e4';
update areas set canonical_name = 'ΝΕΑ ΙΩΝΙΑ', aliases = ARRAY['Ν. ΙΩΝΙΑ','Ν.ΙΩΝΙΑ']
where id = '85d0e9bb-2e19-4c0c-9bfc-94d5ee79cf08';
update areas set canonical_name = 'ΝΕΑ ΜΑΚΡΗ', aliases = ARRAY['Ν. ΜΑΚΡΗ','Ν.ΜΑΚΡΗ']
where id = '9f0f71fb-d049-4266-8ded-e5be230464e7';
update areas set canonical_name = 'ΝΕΑ ΠΕΝΤΕΛΗ', aliases = ARRAY['Ν. ΠΕΝΤΕΛΗ','Ν.ΠΕΝΤΕΛΗ']
where id = '0381c9bc-c4c4-4953-b83a-6d7acf1c08bc';
update areas set canonical_name = 'ΝΕΑ ΠΕΡΑΜΟΣ', aliases = ARRAY['Ν. ΠΕΡΑΜΟΣ','Ν.ΠΕΡΑΜΟΣ']
where id = 'be41269e-9f89-4c93-943b-69a944a44dbb';
update areas set canonical_name = 'ΝΕΑ ΣΜΥΡΝΗ', aliases = ARRAY['Ν. ΣΜΥΡΝΗ','Ν.ΣΜΥΡΝΗ']
where id = 'f36977d2-b006-42c6-a69c-c0208b964d16';
update areas set canonical_name = 'ΝΕΑ ΦΙΛΑΔΕΛΦΕΙΑ', aliases = ARRAY['Ν. ΦΙΛΑΔΕΛΦΕΙΑ','Ν.ΦΙΛΑΔΕΛΦΕΙΑ']
where id = '6acd5e2a-2d79-4375-bceb-020b174d06a5';
update areas set canonical_name = 'ΝΕΟ ΨΥΧΙΚΟ', aliases = ARRAY['Ν. ΨΥΧΙΚΟ','Ν.ΨΥΧΙΚΟ']
where id = '712429b0-ea55-44b0-b28f-57907e506b16';
update areas set canonical_name = 'ΠΑΛΑΙΟ ΦΑΛΗΡΟ', aliases = ARRAY['Π. ΦΑΛΗΡΟ','Π.ΦΑΛΗΡΟ','ΠΑΛΙΟ ΦΑΛΗΡΟ']
where id = 'c8c474ed-f5fa-47e1-9345-c64dae9dda98';

update doctors set region = 'ΝΕΑ ΕΡΥΘΡΑΙΑ' where region in ('Ν. ΕΡΥΘΡΑΙΑ','Ν.ΕΡΥΘΡΑΙΑ');
update doctors set region = 'ΝΕΟ ΗΡΑΚΛΕΙΟ' where region in ('Ν. ΗΡΑΚΛΕΙΟ','Ν.ΗΡΑΚΛΕΙΟ');
update doctors set region = 'ΝΕΑ ΙΩΝΙΑ' where region in ('Ν. ΙΩΝΙΑ','Ν.ΙΩΝΙΑ');
update doctors set region = 'ΝΕΑ ΜΑΚΡΗ' where region in ('Ν. ΜΑΚΡΗ','Ν.ΜΑΚΡΗ');
update doctors set region = 'ΝΕΑ ΠΕΝΤΕΛΗ' where region in ('Ν. ΠΕΝΤΕΛΗ','Ν.ΠΕΝΤΕΛΗ');
update doctors set region = 'ΝΕΑ ΠΕΡΑΜΟΣ' where region in ('Ν. ΠΕΡΑΜΟΣ','Ν.ΠΕΡΑΜΟΣ');
update doctors set region = 'ΝΕΑ ΣΜΥΡΝΗ' where region in ('Ν. ΣΜΥΡΝΗ','Ν.ΣΜΥΡΝΗ');
update doctors set region = 'ΝΕΑ ΦΙΛΑΔΕΛΦΕΙΑ' where region in ('Ν. ΦΙΛΑΔΕΛΦΕΙΑ','Ν.ΦΙΛΑΔΕΛΦΕΙΑ');
update doctors set region = 'ΝΕΟ ΨΥΧΙΚΟ' where region in ('Ν. ΨΥΧΙΚΟ','Ν.ΨΥΧΙΚΟ');
update doctors set region = 'ΠΑΛΑΙΟ ΦΑΛΗΡΟ' where region in ('Π. ΦΑΛΗΡΟ','Π.ΦΑΛΗΡΟ','ΠΑΛΙΟ ΦΑΛΗΡΟ');
