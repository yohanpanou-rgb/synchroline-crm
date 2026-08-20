import Link from "next/link";
import { Badge } from "@/components/ui/Badge";
import { formatDoctorName } from "@/lib/utils/name-normalization";
import { RATING_CPO_LABEL } from "@/lib/constants/rating";
import type { Database, RatingCpo } from "@/lib/types/database.types";

type Doctor = Database["public"]["Tables"]["doctors"]["Row"];

const RATING_TONE: Record<RatingCpo, "success" | "warning" | "danger" | "neutral"> = {
  "1": "success",
  "2": "neutral",
  "3": "warning",
  "0": "neutral",
  ΥΔ: "danger",
};

const STATUS_LABEL = {
  active: "Ενεργός",
  pending_approval: "Εκκρεμεί έγκριση",
  archived: "Αρχειοθετημένος",
} as const;

export function DoctorCard({
  doctor,
  repName,
}: {
  doctor: Doctor;
  repName?: string | null;
}) {
  return (
    <Link
      href={`/doctors/${doctor.id}`}
      className="flex items-center justify-between gap-3 rounded-2xl border border-black/5 bg-white p-4 shadow-sm transition-colors hover:border-primary/30"
    >
      <div className="min-w-0">
        <p className="truncate text-sm font-semibold text-ink">
          {formatDoctorName(doctor.last_name, doctor.first_name)}
        </p>
        {doctor.academic_title && (
          <p className="truncate text-xs text-primary">{doctor.academic_title}</p>
        )}
        <p className="truncate text-xs text-ink/50">
          {[doctor.county, doctor.region].filter(Boolean).join(" · ") || "—"}
        </p>
        {repName && (
          <p className="truncate text-xs text-ink/40">{repName}</p>
        )}
      </div>
      <div className="flex shrink-0 flex-col items-end gap-1">
        <Badge tone={RATING_TONE[doctor.rating_cpo]}>
          {RATING_CPO_LABEL[doctor.rating_cpo]}
        </Badge>
        {doctor.priority_color && (
          <Badge tone="neutral">Προτεραιότητα {doctor.priority_color}</Badge>
        )}
        {doctor.status !== "active" && (
          <Badge tone="neutral">{STATUS_LABEL[doctor.status]}</Badge>
        )}
      </div>
    </Link>
  );
}
