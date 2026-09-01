-- Private doctors and hospital doctors are now mutually exclusive, universally
-- (previously non-shared-hospital doctors kept current_rep_id and still counted
-- toward the owning rep's private KPI). Hospital-doctor ownership/visibility is
-- now derived solely from institution_reps, never from current_rep_id.

update territory_assignments ta
set valid_to = current_date
from doctors d
where ta.doctor_id = d.id
  and ta.valid_to is null
  and d.institution is not null;

update doctors
set current_rep_id = null
where institution is not null
  and current_rep_id is not null;
