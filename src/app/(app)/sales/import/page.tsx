import { redirect } from "next/navigation";
import { requireProfile } from "@/lib/supabase/profile";
import { SalesImportWizard } from "@/components/sales/SalesImportWizard";
import { BackButton } from "@/components/ui/BackButton";

export default async function SalesImportPage() {
  const profile = await requireProfile();
  if (profile.role !== "admin") redirect("/sales");

  return (
    <div className="mx-auto max-w-2xl">
      <BackButton fallbackHref="/sales" />
      <h1 className="mb-1 text-xl font-semibold text-primary-dark">
        Εισαγωγή πωλήσεων
      </h1>
      <p className="mb-6 text-sm text-ink/50">
        Ανέβασε το αρχείο SOX (xlsx/csv) — κάθε εισαγωγή αντικαθιστά πλήρως τα
        προηγούμενα δεδομένα πωλήσεων.
      </p>
      <SalesImportWizard />
    </div>
  );
}
