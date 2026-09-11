-- Το φίλτρο "Περιοχή" στο Πελατολόγιο δείχνει το ωμό doctors.region κείμενο
-- -- δύο παραλλαγές γραφής της ίδιας περιοχής εμφανίζονταν ως ξεχωριστές
-- επιλογές (π.χ. "ΖΩΓΡΑΦΟΣ"/"ΖΩΓΡΑΦΟΥ", "ΚΟΛΟΝΑΚΙ"/"ΚΟΛΩΝΑΚΙ"). Ενοποίηση
-- στην κανονική γραφή (ίδια σύμβαση με τα aliases του areas catalog).
update doctors set region = 'ΚΟΛΩΝΑΚΙ' where region = 'ΚΟΛΟΝΑΚΙ';
update doctors set region = 'ΚΕΝΤΡΟ ΘΕΣΣΑΛΟΝΙΚΗΣ' where region = 'ΚΕΝΤΡΟ';
update doctors set region = 'ΔΙΔΥΜΟΤΕΙΧΟ' where region = 'ΔΙΔΙΜΟΤΕΙΧΟ';
update doctors set region = 'ΣΥΡΟΣ' where region = 'ΕΡΜΟΥΠΟΛΗ';
update doctors set region = 'ΚΟΜΟΤΗΝΗ' where region = 'ΚΟΜΜΟΤΗΝΗ';
update doctors set region = 'ΚΟΡΥΔΑΛΛΟΣ' where region = 'ΚΟΡΥΔΑΛΟΣ';
update doctors set region = 'ΛΕΒΑΔΕΙΑ' where region = 'ΛΙΒΑΔΕΙΑ';
update doctors set region = 'ΜΕΣΟΛΟΓΓΙ' where region = 'ΜΕΣΣΟΛΟΓΓΙ';
update doctors set region = 'ΟΡΕΣΤΙΑΔΑ' where region = 'ΟΡΕΣΤΕΙΑΔΑ';
update doctors set region = 'ΜΕΝΙΔΙ' where region = 'ΑΧΑΡΝΕΣ';
update doctors set region = 'ΖΩΓΡΑΦΟΥ' where region = 'ΖΩΓΡΑΦΟΣ';
