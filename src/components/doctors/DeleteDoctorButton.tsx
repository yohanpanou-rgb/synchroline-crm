"use client";

import { deleteDoctor } from "@/app/(app)/doctors/actions";

export function DeleteDoctorButton({
  doctorId,
  doctorName,
}: {
  doctorId: string;
  doctorName: string;
}) {
  return (
    <form
      action={deleteDoctor.bind(null, doctorId)}
      onSubmit={(e) => {
        if (
          !window.confirm(
            `Οριστική διαγραφή του "${doctorName}"; Αυτή η ενέργεια δεν αναιρείται.`,
          )
        ) {
          e.preventDefault();
        }
      }}
    >
      <button
        type="submit"
        className="text-xs font-medium text-danger hover:underline"
      >
        Διαγραφή γιατρού
      </button>
    </form>
  );
}
